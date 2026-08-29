import type { DispatchTask } from "./relay.js";
import { sessionIdForTopic } from "./session.js";

export type GitHubConfig = {
  apiUrl: string;
  ref: string;
  repository: string;
  token: string;
  workflow: string;
  timeoutMs?: number;
};

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export function createGitHubDispatcher(
  config: GitHubConfig,
  fetcher: Fetcher = fetch,
): DispatchTask {
  const endpoint = `${config.apiUrl.replace(/\/$/, "")}/repos/${config.repository}/actions/workflows/${encodeURIComponent(config.workflow)}/dispatches`;

  return async (task) => {
    const response = await fetcher(endpoint, {
      body: JSON.stringify({
        inputs: {
          ...(task.imageKeys?.length ? { feishu_image_keys: JSON.stringify(task.imageKeys) } : {}),
          feishu_message_id: task.messageId,
          feishu_sender: task.senderOpenId ?? "",
          feishu_sender_name: "",
          prompt: task.text,
          session_uuid: sessionIdForTopic(task.threadKey),
          thread_key: task.threadKey,
        },
        ref: config.ref,
      }),
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      method: "POST",
      signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
    });

    if (!response.ok) {
      throw new Error(`GitHub workflow dispatch failed with ${response.status}`);
    }

    return undefined;
  };
}
