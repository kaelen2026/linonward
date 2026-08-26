import { describe, expect, it } from "vitest";

import { sessionIdForTopic } from "./session.js";

describe("sessionIdForTopic", () => {
  it("returns the same UUID for follow-ups in one Feishu topic", () => {
    expect(sessionIdForTopic("omt_topic")).toBe(sessionIdForTopic("omt_topic"));
  });

  it("isolates sessions from different Feishu topics", () => {
    expect(sessionIdForTopic("omt_one")).not.toBe(sessionIdForTopic("omt_two"));
  });

  it("returns an RFC 4122 version 5 UUID", () => {
    expect(sessionIdForTopic("omt_topic")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
