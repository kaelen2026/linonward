import { describe, expect, it } from "vitest";

import { webSessionSchema } from "./session.js";

describe("webSessionSchema", () => {
  it("uses the email as the display name when authentication returns an empty name", () => {
    const session = webSessionSchema.parse({
      user: {
        email: "reader@example.com",
        id: "usr_1",
        name: "",
      },
    });

    expect(session.user.name).toBe("reader@example.com");
  });

  it("preserves an optional user avatar", () => {
    const session = webSessionSchema.parse({
      user: {
        email: "reader@example.com",
        id: "usr_1",
        image: "https://example.com/avatar.png",
        name: "Reader",
      },
    });

    expect(session.user.image).toBe("https://example.com/avatar.png");
  });
});
