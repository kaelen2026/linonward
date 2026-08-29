import { describe, expect, it } from "vitest";

import {
  bootstrapAdministratorAccess,
  hasContentCapability,
  isAdministrator,
  readAdministratorEmails,
} from "./authorization.js";

describe("administrator authorization", () => {
  it("normalizes a configured allow-list and matches email case-insensitively", () => {
    const administrators = readAdministratorEmails(" owner@example.com,OWNER@example.com ");

    expect(administrators).toEqual(["owner@example.com"]);
    expect(
      isAdministrator(
        { user: { id: "usr_1", name: "Owner", email: "OWNER@example.com" } },
        administrators,
      ),
    ).toBe(true);
  });

  it("denies authenticated users that are not administrators", () => {
    expect(
      isAdministrator({ user: { id: "usr_2", name: "Member", email: "member@example.com" } }, []),
    ).toBe(false);
  });

  it("exposes every content capability to bootstrap administrators", () => {
    const access = bootstrapAdministratorAccess();
    expect(hasContentCapability(access, "article.publish")).toBe(true);
    expect(hasContentCapability(access, "article.delete")).toBe(true);
  });

  it("keeps editor capabilities bounded", () => {
    const access = {
      roles: ["editor" as const],
      capabilities: ["article.view" as const, "article.createDraft" as const],
    };
    expect(hasContentCapability(access, "article.createDraft")).toBe(true);
    expect(hasContentCapability(access, "article.publish")).toBe(false);
  });
});
