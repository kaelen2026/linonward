import { describe, expect, it, vi } from "vitest";

import { createMessageIdDeduplicator, handleFeishuMessage, type RelayConfig } from "./relay.js";

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

  it("ignores a duplicate delivery of the same Feishu message", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const claimMessage = createMessageIdDeduplicator();
    const event = {
      message: {
        chat_id: "oc_chat",
        content: JSON.stringify({ text: "summarize the latest commit" }),
        message_id: "om_delivered_twice",
        message_type: "text",
      },
      sender: { sender_id: { open_id: "ou_authorized" } },
    };

    await expect(
      handleFeishuMessage(event, config, dispatch, reply, claimMessage),
    ).resolves.toEqual({ status: "dispatched" });
    await expect(
      handleFeishuMessage(event, config, dispatch, reply, claimMessage),
    ).resolves.toEqual({ status: "ignored" });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch when the durable outbox already contains the task", async () => {
    const dispatch = vi.fn();
    const persistTask = vi.fn().mockResolvedValue(false);

    await expect(
      handleFeishuMessage(
        {
          message: {
            chat_id: "oc_chat",
            content: JSON.stringify({ text: "summarize the latest commit" }),
            message_id: "om_persisted",
            message_type: "text",
          },
          sender: { sender_id: { open_id: "ou_authorized" } },
        },
        config,
        dispatch,
        undefined,
        undefined,
        persistTask,
      ),
    ).resolves.toEqual({ status: "ignored" });

    expect(dispatch).not.toHaveBeenCalled();
    expect(persistTask).toHaveBeenCalledOnce();
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
  });

  it("acknowledges non-text messages without dispatching them", async () => {
    const dispatch = vi.fn();

    await expect(
      handleFeishuMessage(
        {
          message: {
            chat_id: "oc_chat",
            content: "{}",
            message_id: "om_message",
            message_type: "image",
          },
          sender: { sender_id: { open_id: "ou_authorized" } },
        },
        config,
        dispatch,
      ),
    ).resolves.toEqual({ status: "ignored" });

    expect(dispatch).not.toHaveBeenCalled();
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
