import { createClient } from "redis";

import type { ClaimMessage } from "./relay.js";

export type RedisClient = {
  close(): Promise<void>;
  eval(script: string, options: { arguments: string[]; keys: string[] }): Promise<unknown>;
};

export async function connectRedis(url: string): Promise<RedisClient> {
  const client = createClient({ url });
  client.on("error", (error: unknown) => console.error("Feishu Redis client error", error));
  await client.connect();
  return {
    close: () => client.close(),
    eval: (script, options) => client.eval(script, options),
  };
}

export function createRedisMessageDeduplicator(
  client: Pick<RedisClient, "eval">,
  ttlSeconds = 86_400,
): ClaimMessage {
  return async (messageId) => {
    const result = await client.eval(
      "return redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1])",
      { arguments: [String(ttlSeconds)], keys: [`feishu:message:${messageId}`] },
    );
    return result === "OK";
  };
}
