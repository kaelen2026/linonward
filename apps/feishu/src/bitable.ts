import type { Readable } from "node:stream";

export type BitableConfig = {
  appToken: string;
  chatId: string;
  tableId: string;
};

export type BitableMessage = {
  chat_id: string;
  content: string;
  create_time?: string;
  message_id: string;
  message_type: string;
  root_id?: string;
  thread_id?: string;
};

type Attachment = {
  fileKey: string;
  name: string;
  resourceType: "file" | "image";
};

export type BitableClient = {
  bitable: {
    v1: {
      appTableRecord: {
        create(payload: {
          data: { fields: Record<string, unknown> };
          params: { client_token: string };
          path: { app_token: string; table_id: string };
        }): Promise<{ code?: number; msg?: string }>;
      };
    };
  };
  drive: {
    v1: {
      media: {
        uploadAll(payload: {
          data: {
            file: Buffer;
            file_name: string;
            parent_node: string;
            parent_type: "bitable_file" | "bitable_image";
            size: number;
          };
        }): Promise<{ file_token?: string } | null>;
      };
    };
  };
  im: {
    v1: {
      messageResource: {
        get(payload: {
          params: { type: string };
          path: { file_key: string; message_id: string };
        }): Promise<{ getReadableStream(): Readable }>;
      };
    };
  };
};

export type WriteBitableMessage = (message: BitableMessage) => Promise<void>;

export function createBitableMessageWriter(
  client: BitableClient,
  config: BitableConfig,
): WriteBitableMessage {
  return async (message) => {
    if (message.chat_id !== config.chatId) return;

    const parsed = parseMessageContent(message.message_type, message.content);
    const attachments = await Promise.all(
      parsed.attachments.map(async (attachment) => {
        const resource = await client.im.v1.messageResource.get({
          params: { type: attachment.resourceType },
          path: { file_key: attachment.fileKey, message_id: message.message_id },
        });
        const file = await readableToBuffer(resource.getReadableStream());
        const uploaded = await client.drive.v1.media.uploadAll({
          data: {
            file,
            file_name: attachment.name,
            parent_node: config.appToken,
            parent_type: attachment.resourceType === "image" ? "bitable_image" : "bitable_file",
            size: file.byteLength,
          },
        });
        if (!uploaded?.file_token) {
          throw new Error(`Feishu attachment upload failed for ${attachment.name}`);
        }
        return { file_token: uploaded.file_token };
      }),
    );

    const timestamp = Number(message.create_time);
    const response = await client.bitable.v1.appTableRecord.create({
      data: {
        fields: {
          内容: parsed.text,
          时间: Number.isFinite(timestamp) ? timestamp : Date.now(),
          附件: attachments,
        },
      },
      params: { client_token: message.message_id },
      path: { app_token: config.appToken, table_id: config.tableId },
    });
    if (response.code !== undefined && response.code !== 0) {
      throw new Error(
        `Feishu Bitable record creation failed: ${response.code} ${response.msg ?? ""}`,
      );
    }
  };
}

export function parseMessageContent(
  messageType: string,
  content: string,
): { attachments: Attachment[]; text: string } {
  const value = parseObject(content);
  if (!value) return { attachments: [], text: "" };

  if (messageType === "text") {
    return { attachments: [], text: typeof value.text === "string" ? value.text : "" };
  }

  if (messageType === "post") {
    return { attachments: [], text: extractPostText(value) };
  }

  const key = messageType === "image" ? value.image_key : value.file_key;
  if (typeof key !== "string" || !key) {
    return { attachments: [], text: describeMessage(messageType) };
  }
  const resourceType = messageType === "image" ? "image" : "file";
  const name =
    typeof value.file_name === "string" && value.file_name
      ? value.file_name
      : resourceType === "image"
        ? `${key}.jpg`
        : key;
  return {
    attachments: [{ fileKey: key, name, resourceType }],
    text: resourceType === "image" ? "[图片]" : name,
  };
}

function parseObject(content: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(content);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function extractPostText(value: Record<string, unknown>): string {
  const parts: string[] = [];
  const title = value.title;
  if (typeof title === "string") parts.push(title);
  const content = value.content;
  if (Array.isArray(content)) {
    for (const line of content) {
      if (!Array.isArray(line)) continue;
      for (const node of line) {
        if (typeof node !== "object" || node === null) continue;
        const text = (node as Record<string, unknown>).text;
        if (typeof text === "string") parts.push(text);
      }
    }
  }
  return parts.join("\n");
}

function describeMessage(messageType: string): string {
  return messageType ? `[${messageType}]` : "";
}

async function readableToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
