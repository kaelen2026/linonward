import { describe, expect, it, vi } from "vitest";

import { handleFeishuMessage, type RelayConfig } from "./relay.js";

const config: RelayConfig = {
  allowedOpenIds: new Set(["ou_authorized"]),
  maxTaskLength: 6_000,
};

describe("handleFeishuMessage", () => {
  it("dispatches a text message from an authorized sender", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);

    await expect(
      handleFeishuMessage(
        {
          message: {
            chat_id: "oc_chat",
            content: JSON.stringify({ text: "  summarize the latest commit  " }),
            message_id: "om_message",
            message_type: "text",
          },
          sender: { sender_id: { open_id: "ou_authorized" } },
        },
        config,
        dispatch,
      ),
    ).resolves.toEqual({ status: "dispatched" });

    expect(dispatch).toHaveBeenCalledWith({
      chatId: "oc_chat",
      messageId: "om_message",
      text: "summarize the latest commit",
    });
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
