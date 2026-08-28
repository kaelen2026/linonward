import { describe, expect, it, vi } from "vitest";

import { createRedisMessageDeduplicator } from "./redis.js";

describe("createRedisMessageDeduplicator", () => {
  it("claims each Feishu message atomically with an expiry", async () => {
    const evalCommand = vi.fn().mockResolvedValue("OK");
    const claim = createRedisMessageDeduplicator({ eval: evalCommand });

    await expect(claim("om_message")).resolves.toBe(true);
    expect(evalCommand).toHaveBeenCalledWith(expect.stringContaining("'NX'"), {
      arguments: ["86400"],
      keys: ["feishu:message:om_message"],
    });
  });

  it("does not reclaim a message another replica already owns", async () => {
    const claim = createRedisMessageDeduplicator({ eval: vi.fn().mockResolvedValue(null) });

    await expect(claim("om_message")).resolves.toBe(false);
  });
});
