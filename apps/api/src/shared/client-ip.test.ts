import { describe, expect, it } from "vitest";

import { clientIp } from "./client-ip.js";

describe("clientIp", () => {
  it("uses the socket peer when the connection is not from a trusted proxy", () => {
    expect(
      clientIp({
        remoteAddress: "198.51.100.10",
        forwardedFor: "203.0.113.99",
        trustedProxyIps: [],
      }),
    ).toBe("198.51.100.10");
  });

  it("uses the rightmost valid forwarded address from a configured proxy", () => {
    expect(
      clientIp({
        remoteAddress: "10.0.0.4",
        forwardedFor: "198.51.100.10, 203.0.113.7",
        trustedProxyIps: ["10.0.0.4"],
      }),
    ).toBe("203.0.113.7");
  });

  it("does not turn a malformed forwarded value into a limiter key", () => {
    expect(
      clientIp({
        remoteAddress: "10.0.0.4",
        forwardedFor: "not-an-ip",
        trustedProxyIps: ["10.0.0.4"],
      }),
    ).toBe("10.0.0.4");
  });
});
