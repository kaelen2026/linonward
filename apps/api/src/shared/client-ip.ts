import { isIP } from "node:net";

export type ClientIpOptions = {
  forwardedFor: string | undefined;
  remoteAddress: string | undefined;
  trustedProxyIps: readonly string[];
};

/**
 * Returns the socket peer unless it is an explicitly trusted proxy. A client
 * can forge forwarding headers, so those headers are never evidence by
 * themselves. Trusted proxies must replace or append `X-Forwarded-For`; for
 * the latter, the rightmost valid address is the direct client they observed.
 */
export function clientIp({
  forwardedFor,
  remoteAddress,
  trustedProxyIps,
}: ClientIpOptions): string {
  const peer = validIp(remoteAddress);
  if (!peer || !trustedProxyIps.includes(peer)) {
    return peer ?? "unknown";
  }

  const forwarded = forwardedFor
    ?.split(",")
    .reverse()
    .map((value) => validIp(value))
    .find((value): value is string => value !== undefined);

  return forwarded ?? peer;
}

function validIp(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : undefined;
}
