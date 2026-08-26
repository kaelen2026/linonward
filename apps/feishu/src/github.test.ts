import { describe, expect, it, vi } from "vitest";

import { createGitHubDispatcher } from "./github.js";
import { sessionIdForTopic } from "./session.js";

describe("createGitHubDispatcher", () => {
  it("dispatches the Feishu task to the unified bot workflow", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const dispatch = createGitHubDispatcher(
      {
        apiUrl: "https://api.github.com",
        repository: "kaelen2026/linonward",
        ref: "main",
        token: "github-token",
        workflow: "linonward-bot.yml",
      },
      fetcher,
    );

    await expect(
      dispatch({
        chatId: "oc_chat",
        messageId: "om_message",
        route: "github",
        senderOpenId: "ou_sender",
        text: "summarize the latest commit",
        threadKey: "omt_topic",
      }),
    ).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.github.com/repos/kaelen2026/linonward/actions/workflows/linonward-bot.yml/dispatches",
      expect.objectContaining({
        body: JSON.stringify({
          inputs: {
            feishu_message_id: "om_message",
            feishu_sender: "ou_sender",
            feishu_sender_name: "",
            prompt: "summarize the latest commit",
            session_uuid: sessionIdForTopic("omt_topic"),
            thread_key: "omt_topic",
          },
          ref: "main",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer github-token",
          "Content-Type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("throws when GitHub rejects the dispatch", async () => {
    const dispatch = createGitHubDispatcher(
      {
        apiUrl: "https://api.github.com",
        repository: "kaelen2026/linonward",
        ref: "main",
        token: "github-token",
        workflow: "linonward-bot.yml",
      },
      vi.fn().mockResolvedValue(new Response("Bad credentials", { status: 401 })),
    );

    await expect(
      dispatch({
        chatId: "oc_chat",
        messageId: "om_message",
        route: "github",
        senderOpenId: "ou_sender",
        text: "run task",
        threadKey: "om_task",
      }),
    ).rejects.toThrow("GitHub workflow dispatch failed with 401");
  });
});
