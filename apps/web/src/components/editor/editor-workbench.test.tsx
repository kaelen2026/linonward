import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorWorkbench } from "./editor-workbench";

function renderWorkbench(props: {
  authorName: string;
  canPublish: boolean;
  userImage?: string | null;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditorWorkbench {...props} userEmail="editor@example.com" userName="Editor Person" />
    </QueryClientProvider>,
  );
}

describe("EditorWorkbench permissions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ articles: [] }))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not offer publication to an editor without that capability", () => {
    renderWorkbench({ authorName: "Editor", canPublish: false });
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发布" })).not.toBeInTheDocument();
  });

  it("offers publication to an administrator", () => {
    renderWorkbench({ authorName: "Administrator", canPublish: true });
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();
  });

  it("identifies the signed-in user and offers sign out", () => {
    renderWorkbench({ authorName: "Editor Person", canPublish: true });

    expect(screen.getByText("EP")).toBeInTheDocument();
    expect(screen.queryByText("editor@example.com")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开用户菜单" }));

    expect(screen.getByText("Editor Person")).toBeInTheDocument();
    expect(screen.getByText("editor@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退出" })).toBeInTheDocument();
  });

  it("links the brand back to the main site", () => {
    renderWorkbench({ authorName: "Editor Person", canPublish: true });

    expect(screen.getByRole("link", { name: "LinOnward" })).toHaveAttribute("href", "/");
  });

  it("saves a draft before issuing an explicit publication command", async () => {
    const article = {
      id: "art_1",
      title: "Draft",
      slug: "draft",
      excerpt: "Draft excerpt",
      content: { type: "doc" },
      coverImageUrl: null,
      locale: "zh",
      status: "draft",
      authorName: "Administrator",
      seoDescription: "Draft description",
      publishedAt: null,
      createdAt: "2026-08-29T12:00:00.000Z",
      updatedAt: "2026-08-29T12:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ articles: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ article })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            article: { ...article, status: "published", publishedAt: article.updatedAt },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderWorkbench({ authorName: "Administrator", canPublish: true });

    fireEvent.click(screen.getByRole("button", { name: "发布" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/content/admin/articles");
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).not.toHaveProperty("status");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/content/admin/articles/art_1/publish");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
  });
});
