import type { DispatchTask } from "./relay.js";

export type GitHubConfig = {
  apiUrl: string;
  repository: string;
  token: string;
};

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export function createGitHubDispatcher(
  config: GitHubConfig,
  fetcher: Fetcher = fetch,
): DispatchTask {
  const endpoint = `${config.apiUrl.replace(/\/$/, "")}/repos/${config.repository}/dispatches`;

  return async (task) => {
    const response = await fetcher(endpoint, {
      body: JSON.stringify({
        client_payload: {
          chat_id: task.chatId,
          message_id: task.messageId,
          text: task.text,
        },
        event_type: "feishu-task",
      }),
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`GitHub repository dispatch failed with ${response.status}`);
    }
  };
}
