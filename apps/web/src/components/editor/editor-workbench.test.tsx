import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorWorkbench } from "./editor-workbench";

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
    render(<EditorWorkbench authorName="Editor" canPublish={false} />);
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发布" })).not.toBeInTheDocument();
  });

  it("offers publication to an administrator", () => {
    render(<EditorWorkbench authorName="Administrator" canPublish />);
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();
  });
});
