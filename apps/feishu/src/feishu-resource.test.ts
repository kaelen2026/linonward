import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import { createFeishuImageLoader } from "./feishu-resource.js";

describe("createFeishuImageLoader", () => {
  it("downloads message images as data URLs", async () => {
    const get = vi.fn().mockResolvedValue({
      getReadableStream: () => Readable.from([Buffer.from("image")]),
      headers: { "content-type": "image/png" },
    });
    const loadImages = createFeishuImageLoader(
      { appId: "cli_app", appSecret: "secret" },
      { im: { v1: { messageResource: { get } } } },
    );

    await expect(
      loadImages({
        chatId: "oc_chat",
        imageKeys: ["img_first"],
        messageId: "om_message",
        route: "hermes",
        text: "inspect",
        threadKey: "omt_topic",
      }),
    ).resolves.toEqual(["data:image/png;base64,aW1hZ2U="]);
    expect(get).toHaveBeenCalledWith({
      params: { type: "image" },
      path: { file_key: "img_first", message_id: "om_message" },
    });
  });
});
