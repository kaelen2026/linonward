import type { Readable } from "node:stream";
import * as Lark from "@larksuiteoapi/node-sdk";

import type { FeishuConfig } from "./config.js";
import type { LoadTaskImages } from "./hermes.js";

const maxImageBytes = 20 * 1024 * 1024;

type ResourceClient = {
  im: {
    v1: {
      messageResource: {
        get(payload: {
          params: { type: string };
          path: { file_key: string; message_id: string };
        }): Promise<{ getReadableStream(): Readable; headers: Record<string, unknown> }>;
      };
    };
  };
};

export function createFeishuImageLoader(
  config: FeishuConfig,
  client: ResourceClient = new Lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
  }) as unknown as ResourceClient,
): LoadTaskImages {
  return async (task) => {
    const images: string[] = [];
    for (const imageKey of task.imageKeys ?? []) {
      const resource = await client.im.v1.messageResource.get({
        params: { type: "image" },
        path: { file_key: imageKey, message_id: task.messageId },
      });
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of resource.getReadableStream()) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > maxImageBytes) throw new Error("Feishu image exceeds the 20 MB limit");
        chunks.push(buffer);
      }
      const contentType = readContentType(resource.headers);
      images.push(`data:${contentType};base64,${Buffer.concat(chunks).toString("base64")}`);
    }
    return images;
  };
}

function readContentType(headers: Record<string, unknown>): string {
  const value = headers["content-type"] ?? headers["Content-Type"];
  const contentType = Array.isArray(value) ? value[0] : value;
  return typeof contentType === "string" && contentType.startsWith("image/")
    ? (contentType.split(";", 1)[0] ?? "image/jpeg")
    : "image/jpeg";
}
