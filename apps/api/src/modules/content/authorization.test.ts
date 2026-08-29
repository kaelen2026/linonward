import { describe, expect, it } from "vitest";
import { requireContentAdministrator } from "./authorization.js";

describe("content administration", () => {
  it("rejects anonymous and non-administrator sessions", () => {
    expect(() => requireContentAdministrator(null, ["admin@linonward.com"])).toThrow("Sign in");
    expect(() =>
      requireContentAdministrator({ user: { email: "reader@example.com", name: "R" } }, [
        "admin@linonward.com",
      ]),
    ).toThrow("Administrator");
  });

  it("accepts a configured administrator", () => {
    expect(
      requireContentAdministrator({ user: { email: "ADMIN@linonward.com", name: "A" } }, [
        "admin@linonward.com",
      ]).user.name,
    ).toBe("A");
  });
});
