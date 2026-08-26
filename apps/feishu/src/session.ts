import { createHash } from "node:crypto";

// Fixed namespace for Feishu-topic-to-Claude-session mapping. It is an identifier,
// not a secret: changing it would disconnect every existing topic from its session.
const topicSessionNamespace = "6c77018d-0ca0-4d8f-9484-0f0ab6b497ea";

export function sessionIdForTopic(topicKey: string): string {
  const namespace = Buffer.from(topicSessionNamespace.replaceAll("-", ""), "hex");
  const digest = createHash("sha1").update(namespace).update(topicKey, "utf8").digest();
  const uuid = Buffer.from(digest.subarray(0, 16));

  uuid[6] = ((uuid[6] as number) & 0x0f) | 0x50;
  uuid[8] = ((uuid[8] as number) & 0x3f) | 0x80;

  const hex = uuid.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
