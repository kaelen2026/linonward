import { describe, expect, it, vi } from "vitest";

import { createHermesDispatcher } from "./hermes.js";

describe("createHermesDispatcher", () => {
  it("sends a content task to Hermes with a topic-scoped conversation", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [{ text: "成稿内容", type: "output_text" }],
              role: "assistant",
              type: "message",
            },
          ],
          status: "completed",
        }),
        { status: 200 },
      ),
    );
    const dispatch = createHermesDispatcher(
      {
        apiKey: "hermes-api-key",
        apiUrl: "http://host.docker.internal:8642/v1",
        model: "contentchief",
      },
      fetcher,
    );

    await expect(
      dispatch({
        chatId: "oc_chat",
        messageId: "om_message",
        route: "hermes",
        text: "写一篇产品介绍",
        threadKey: "omt_topic",
      }),
    ).resolves.toEqual({ reply: "成稿内容" });

    expect(fetcher).toHaveBeenCalledWith(
      "http://host.docker.internal:8642/v1/responses",
      expect.objectContaining({
        body: JSON.stringify({
          conversation: "feishu:omt_topic",
          input: "写一篇产品介绍",
          model: "contentchief",
          store: true,
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer hermes-api-key",
          "X-Hermes-Session-Key": "feishu:oc_chat:omt_topic",
        }),
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects an unsuccessful Hermes response without exposing its body", async () => {
    const dispatch = createHermesDispatcher(
      {
        apiKey: "hermes-api-key",
        apiUrl: "http://host.docker.internal:8642/v1",
        model: "contentchief",
      },
      vi.fn().mockResolvedValue(new Response("provider details", { status: 502 })),
    );

    await expect(
      dispatch({
        chatId: "oc_chat",
        messageId: "om_message",
        route: "hermes",
        text: "写一篇产品介绍",
        threadKey: "omt_topic",
      }),
    ).rejects.toThrow("Hermes content request failed with 502");
  });
});
