import type { HermesConfig } from "./config.js";
import type { DispatchTask, Task } from "./relay.js";

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
export type LoadTaskImages = (task: Task) => Promise<string[]>;

type HermesResponse = {
  output?: Array<{
    content?: Array<{ text?: unknown; type?: string }>;
    role?: string;
    type?: string;
  }>;
  status?: string;
};

export function createHermesDispatcher(
  config: HermesConfig,
  fetcher: Fetcher = fetch,
  loadImages: LoadTaskImages = async () => [],
): DispatchTask {
  const endpoint = `${config.apiUrl}/responses`;

  return async (task) => {
    const images = task.imageKeys?.length ? await loadImages(task) : [];
    const response = await fetcher(endpoint, {
      body: JSON.stringify({
        conversation: `feishu:${task.threadKey}`,
        input:
          images.length > 0
            ? [
                {
                  content: [
                    { text: task.text, type: "input_text" },
                    ...images.map((imageUrl) => ({ image_url: imageUrl, type: "input_image" })),
                  ],
                  role: "user",
                },
              ]
            : task.text,
        model: config.model,
        store: true,
      }),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Hermes-Session-Key": `feishu:${task.chatId}:${task.threadKey}`,
      },
      method: "POST",
      signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
    });

    if (!response.ok) {
      throw new Error(`Hermes content request failed with ${response.status}`);
    }

    const reply = readResponseText((await response.json()) as HermesResponse);
    if (!reply) {
      throw new Error("Hermes content request completed without a text response");
    }
    return { reply };
  };
}

function readResponseText(response: HermesResponse): string | undefined {
  if (response.status !== "completed") {
    return undefined;
  }

  const text = response.output
    ?.filter((item) => item.type === "message" && item.role === "assistant")
    .flatMap((item) => item.content ?? [])
    .flatMap((content) =>
      content.type === "output_text" && typeof content.text === "string"
        ? [content.text.trim()]
        : [],
    )
    .filter(Boolean)
    .join("\n\n");

  return text || undefined;
}
