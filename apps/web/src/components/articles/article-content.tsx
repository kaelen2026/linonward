import type { ReactNode } from "react";
import type { RichTextDocument } from "@/components/editor/rich-text-schema";

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: Node[];
};

function renderChildren(node: Node, key: string): ReactNode {
  return node.content?.map((child, index) => renderNode(child, `${key}-${index}`));
}

function renderNode(node: Node, key: string): ReactNode {
  if (node.type === "text") {
    let result: ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "strong") result = <strong key={`${key}-strong`}>{result}</strong>;
      if (mark.type === "em") result = <em key={`${key}-em`}>{result}</em>;
      if (mark.type === "code") result = <code key={`${key}-code`}>{result}</code>;
      if (mark.type === "link" && typeof mark.attrs?.href === "string")
        result = (
          <a href={mark.attrs.href} key={`${key}-link`} rel="noopener noreferrer">
            {result}
          </a>
        );
    }
    return result;
  }
  const children = renderChildren(node, key);
  if (node.type === "paragraph") return <p key={key}>{children}</p>;
  if (node.type === "heading")
    return node.attrs?.level === 1 ? <h2 key={key}>{children}</h2> : <h3 key={key}>{children}</h3>;
  if (node.type === "blockquote") return <blockquote key={key}>{children}</blockquote>;
  if (node.type === "bullet_list") return <ul key={key}>{children}</ul>;
  if (node.type === "ordered_list") return <ol key={key}>{children}</ol>;
  if (node.type === "list_item") return <li key={key}>{children}</li>;
  if (node.type === "hard_break") return <br key={key} />;
  return <span key={key}>{children}</span>;
}

export function ArticleContent({ document }: { document: RichTextDocument }) {
  return <div className="article-content">{renderChildren(document as Node, "root")}</div>;
}
