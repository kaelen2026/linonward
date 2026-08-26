import { describe, expect, it, vi } from "vitest";

import { createGitHubDispatcher } from "./github.js";

describe("createGitHubDispatcher", () => {
  it("sends the Feishu task as a repository dispatch", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const dispatch = createGitHubDispatcher(
      {
        apiUrl: "https://api.github.com",
        repository: "kaelen2026/linonward",
        token: "github-token",
      },
      fetcher,
    );

    await expect(
      dispatch({ chatId: "oc_chat", messageId: "om_message", text: "summarize the latest commit" }),
    ).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.github.com/repos/kaelen2026/linonward/dispatches",
      expect.objectContaining({
        body: JSON.stringify({
          client_payload: {
            chat_id: "oc_chat",
            message_id: "om_message",
            text: "summarize the latest commit",
          },
          event_type: "feishu-task",
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
        token: "github-token",
      },
      vi.fn().mockResolvedValue(new Response("Bad credentials", { status: 401 })),
    );

    await expect(
      dispatch({ chatId: "oc_chat", messageId: "om_message", text: "run task" }),
    ).rejects.toThrow("GitHub repository dispatch failed with 401");
  });
});
