import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { highlightPlugin } from "@/components/editor/highlight-plugin";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import type { RichTextDocument } from "@/components/editor/rich-text-schema";

const strongDocument: RichTextDocument = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", marks: [{ type: "strong" }], text: "重要内容" }],
    },
  ],
};

describe("RichTextEditor", () => {
  it("exposes an accessible multiline editor and toolbar", async () => {
    render(<RichTextEditor aria-label="文章正文" />);

    expect(await screen.findByRole("textbox", { name: "文章正文" })).toHaveAttribute(
      "aria-multiline",
      "true",
    );
    expect(screen.getByRole("toolbar", { name: "格式工具栏" })).toBeInTheDocument();
    expect(screen.getByText("从这里开始写作")).toBeInTheDocument();
  });

  it("reflects marks at the selection in toolbar state", async () => {
    render(<RichTextEditor initialDocument={strongDocument} />);

    const bold = await screen.findByRole("button", { name: "粗体（⌘B）" });
    await waitFor(() => expect(bold).toHaveAttribute("aria-pressed", "true"));
  });

  it("does not report unchanged initial content as an edit", async () => {
    const onChange = vi.fn();
    render(<RichTextEditor onChange={onChange} />);

    await screen.findByRole("textbox", { name: "富文本编辑器" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("mounts toolbar and schema capabilities from a plugin", async () => {
    const highlightedDocument: RichTextDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", marks: [{ type: "highlight" }], text: "插件内容" }],
        },
      ],
    };

    render(<RichTextEditor initialDocument={highlightedDocument} plugins={[highlightPlugin]} />);

    const highlight = await screen.findByRole("button", { name: "高亮（⇧⌘H）" });
    await waitFor(() => expect(highlight).toHaveAttribute("aria-pressed", "true"));
  });

  it("rejects duplicate plugin ids", () => {
    expect(() => render(<RichTextEditor plugins={[highlightPlugin, highlightPlugin]} />)).toThrow(
      "Duplicate rich text plugin id: highlight",
    );
  });

  it("runs plugin mount and unmount lifecycle hooks", async () => {
    const onCreate = vi.fn();
    const onDestroy = vi.fn();
    const { unmount } = render(
      <RichTextEditor plugins={[{ id: "lifecycle", create: () => ({ onCreate, onDestroy }) }]} />,
    );

    await screen.findByRole("textbox", { name: "富文本编辑器" });
    expect(onCreate).toHaveBeenCalledOnce();
    unmount();
    expect(onDestroy).toHaveBeenCalledOnce();
  });
});
