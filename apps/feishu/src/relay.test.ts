import { describe, expect, it, vi } from "vitest";

import { handleFeishuMessage, type RelayConfig } from "./relay.js";

const config: RelayConfig = {
  allowedOpenIds: new Set(["ou_authorized"]),
  maxTaskLength: 6_000,
};

describe("handleFeishuMessage", () => {
  it("dispatches a text message from an authorized sender", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);

    await expect(
      handleFeishuMessage(
        {
          message: {
            chat_id: "oc_chat",
            content: JSON.stringify({ text: "  summarize the latest commit  " }),
            message_id: "om_message",
            message_type: "text",
            thread_id: "omt_topic",
          },
          sender: { sender_id: { open_id: "ou_authorized" } },
        },
        config,
        dispatch,
        reply,
      ),
    ).resolves.toEqual({ status: "dispatched" });

    expect(dispatch).toHaveBeenCalledWith({
      chatId: "oc_chat",
      messageId: "om_message",
      route: "github",
      senderOpenId: "ou_authorized",
      text: "summarize the latest commit",
      threadKey: "omt_topic",
    });
    expect(reply).toHaveBeenCalledWith(
      {
        chatId: "oc_chat",
        messageId: "om_message",
        route: "github",
        senderOpenId: "ou_authorized",
        text: "summarize the latest commit",
        threadKey: "omt_topic",
      },
      "收到，正在处理。",
    );
  });

  it("dispatches every delivery without retaining message state", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const event = {
      message: {
        chat_id: "oc_chat",
        content: JSON.stringify({ text: "summarize the latest commit" }),
        message_id: "om_delivered_twice",
        message_type: "text",
      },
      sender: { sender_id: { open_id: "ou_authorized" } },
    };

    await expect(handleFeishuMessage(event, config, dispatch, reply)).resolves.toEqual({
      status: "dispatched",
    });
    await expect(handleFeishuMessage(event, config, dispatch, reply)).resolves.toEqual({
      status: "dispatched",
    });

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(reply).toHaveBeenCalledTimes(2);
  });

  it("routes a /内容 command to the local content producer", async () => {
    const dispatch = vi.fn().mockResolvedValue({ reply: "这是成稿。" });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleFeishuMessage(
      {
        message: {
          chat_id: "oc_chat",
          content: JSON.stringify({ text: "/内容 写一篇产品介绍" }),
          message_id: "om_message",
          message_type: "text",
          thread_id: "omt_topic",
        },
        sender: { sender_id: { open_id: "ou_authorized" } },
      },
      config,
      dispatch,
      reply,
    );

    expect(dispatch).toHaveBeenCalledWith({
      chatId: "oc_chat",
      messageId: "om_message",
      route: "hermes",
      senderOpenId: "ou_authorized",
      text: "写一篇产品介绍",
      threadKey: "omt_topic",
    });
    expect(reply).toHaveBeenLastCalledWith(expect.anything(), "这是成稿。");
  });

  it("uses the root message as the topic key when Feishu omits thread_id", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleFeishuMessage(
      {
        message: {
          chat_id: "oc_chat",
          content: JSON.stringify({ text: "follow up" }),
          message_id: "om_reply",
          message_type: "text",
          root_id: "om_root",
        },
        sender: { sender_id: { open_id: "ou_authorized" } },
      },
      config,
      dispatch,
      reply,
    );

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ threadKey: "om_root" }));
  });

  it("ignores a message from an unauthorized sender", async () => {
    const dispatch = vi.fn();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      handleFeishuMessage(
        {
          message: {
            chat_id: "oc_chat",
            content: JSON.stringify({ text: "run this task" }),
            message_id: "om_message",
            message_type: "text",
          },
          sender: { sender_id: { open_id: "ou_unknown" } },
        },
        config,
        dispatch,
      ),
    ).resolves.toEqual({ status: "ignored" });

    expect(dispatch).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith("Ignoring unauthorized Feishu sender", {
      messageId: "om_message",
      openId: "ou_unknown",
    });
    info.mockRestore();
  });

  it("ignores unsupported messages without dispatching them", async () => {
    const dispatch = vi.fn();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      handleFeishuMessage(
        {
          message: {
            chat_id: "oc_chat",
            content: "{}",
            message_id: "om_message",
            message_type: "audio",
          },
          sender: { sender_id: { open_id: "ou_authorized" } },
        },
        config,
        dispatch,
      ),
    ).resolves.toEqual({ status: "ignored" });

    expect(dispatch).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith("Ignoring unsupported Feishu message type", {
      messageId: "om_message",
      messageType: "audio",
    });
    info.mockRestore();
  });

  it("extracts text and images from a rich-text post", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);

    await handleFeishuMessage(
      {
        message: {
          chat_id: "oc_chat",
          content: JSON.stringify({
            content: [
              [
                { tag: "at", user_id: "ou_bot", user_name: "CTO" },
                { tag: "text", text: " inspect this " },
                { image_key: "img_first", tag: "img" },
              ],
              [{ tag: "text", text: "and summarize it" }],
            ],
            title: "",
          }),
          message_id: "om_post",
          message_type: "post",
          thread_id: "omt_topic",
        },
        sender: { sender_id: { open_id: "ou_authorized" } },
      },
      config,
      dispatch,
    );

    expect(dispatch).toHaveBeenCalledWith({
      chatId: "oc_chat",
      imageKeys: ["img_first"],
      messageId: "om_post",
      route: "github",
      senderOpenId: "ou_authorized",
      text: "inspect this\nand summarize it",
      threadKey: "omt_topic",
    });
  });

  it("turns a standalone image into an image-analysis task", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);

    await handleFeishuMessage(
      {
        message: {
          chat_id: "oc_chat",
          content: JSON.stringify({ image_key: "img_only" }),
          message_id: "om_image",
          message_type: "image",
        },
        sender: { sender_id: { open_id: "ou_authorized" } },
      },
      config,
      dispatch,
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        imageKeys: ["img_only"],
        text: "请分析附带的图片并根据图片内容完成任务。",
      }),
    );
  });

  it("ignores an invalid text payload without dispatching it", async () => {
    const dispatch = vi.fn();

    await expect(
      handleFeishuMessage(
        {
          message: {
            chat_id: "oc_chat",
            content: JSON.stringify({ text: "" }),
            message_id: "om_message",
            message_type: "text",
          },
          sender: { sender_id: { open_id: "ou_authorized" } },
        },
        config,
        dispatch,
      ),
    ).resolves.toEqual({ status: "ignored" });

    expect(dispatch).not.toHaveBeenCalled();
  });
});
