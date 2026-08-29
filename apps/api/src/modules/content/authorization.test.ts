import { describe, expect, it } from "vitest";
import { authorizeContent, type ContentPrincipal, contentPrincipal } from "./authorization.js";

const editor: ContentPrincipal = {
  user: { id: "user_editor", email: "editor@linonward.com", name: "Editor" },
  roles: ["editor"],
};
const administrator: ContentPrincipal = {
  user: { id: "user_admin", email: "admin@linonward.com", name: "Administrator" },
  roles: ["administrator"],
};

describe("content role authorization", () => {
  it("lets editors manage drafts but not published content or deletion", () => {
    expect(authorizeContent(editor, "article.view")).toBe(editor);
    expect(authorizeContent(editor, "article.createDraft")).toBe(editor);
    expect(authorizeContent(editor, "article.updateDraft")).toBe(editor);
    expect(() => authorizeContent(editor, "article.publish")).toThrow("permission");
    expect(() => authorizeContent(editor, "article.delete")).toThrow("permission");
  });

  it("lets administrators perform every content capability", () => {
    for (const capability of [
      "article.view",
      "article.createDraft",
      "article.updateDraft",
      "article.publish",
      "article.delete",
    ] as const) {
      expect(authorizeContent(administrator, capability)).toBe(administrator);
    }
  });

  it("rejects an authenticated person without an assigned role", () => {
    expect(() => authorizeContent({ ...editor, roles: [] }, "article.view")).toThrow("permission");
  });

  it("keeps the configured email allow-list as an administrator bootstrap", () => {
    const principal = contentPrincipal(
      { user: { id: "user_bootstrap", email: " ADMIN@linonward.com ", name: "Bootstrap" } },
      [],
      ["admin@linonward.com"],
    );
    expect(principal).toMatchObject({
      roles: ["administrator"],
      user: { email: "admin@linonward.com" },
    });
  });
});
