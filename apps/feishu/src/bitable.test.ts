import { Readable } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import { createBitableMessageWriter, parseMessageContent } from "./bitable.js";

describe("parseMessageContent", () => {
  it("extracts text without treating it as an attachment", () => {
    expect(parseMessageContent("text", JSON.stringify({ text: "群消息" }))).toEqual({
      attachments: [],
      text: "群消息",
    });
  });

  it("extracts a file attachment and its display name", () => {
    expect(
      parseMessageContent(
        "file",
        JSON.stringify({ file_key: "file-key", file_name: "会议纪要.pdf" }),
      ),
    ).toEqual({
      attachments: [{ fileKey: "file-key", name: "会议纪要.pdf", resourceType: "file" }],
      text: "会议纪要.pdf",
    });
  });
});

describe("createBitableMessageWriter", () => {
  it("writes content, uploaded attachments, and message time to the configured table", async () => {
    const resourceGet = vi.fn().mockResolvedValue({
      getReadableStream: () => Readable.from(Buffer.from("pdf")),
    });
    const uploadAll = vi.fn().mockResolvedValue({ file_token: "uploaded-token" });
    const create = vi.fn().mockResolvedValue({ code: 0 });
    const write = createBitableMessageWriter(
      {
        bitable: { v1: { appTableRecord: { create } } },
        drive: { v1: { media: { uploadAll } } },
        im: { v1: { messageResource: { get: resourceGet } } },
      },
      { appToken: "base-token", chatId: "oc_topic_group", tableId: "table-id" },
    );

    await write({
      chat_id: "oc_topic_group",
      content: JSON.stringify({ file_key: "file-key", file_name: "会议纪要.pdf" }),
      create_time: "1756656000123",
      message_id: "om_message",
      message_type: "file",
      root_id: "om_topic",
    });

    expect(resourceGet).toHaveBeenCalledWith({
      params: { type: "file" },
      path: { file_key: "file-key", message_id: "om_message" },
    });
    expect(uploadAll).toHaveBeenCalledWith({
      data: {
        file: expect.any(Buffer),
        file_name: "会议纪要.pdf",
        parent_node: "base-token",
        parent_type: "bitable_file",
        size: 3,
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        fields: {
          内容: "会议纪要.pdf",
          时间: 1756656000123,
          附件: [{ file_token: "uploaded-token" }],
        },
      },
      params: { client_token: "om_message" },
      path: { app_token: "base-token", table_id: "table-id" },
    });
  });

  it("ignores messages outside the configured topic group", async () => {
    const create = vi.fn();
    const write = createBitableMessageWriter(
      {
        bitable: { v1: { appTableRecord: { create } } },
        drive: { v1: { media: { uploadAll: vi.fn() } } },
        im: { v1: { messageResource: { get: vi.fn() } } },
      },
      { appToken: "base-token", chatId: "oc_topic_group", tableId: "table-id" },
    );

    await write({
      chat_id: "oc_other_group",
      content: JSON.stringify({ text: "不应写入" }),
      create_time: "1756656000123",
      message_id: "om_other",
      message_type: "text",
    });

    expect(create).not.toHaveBeenCalled();
  });
});
