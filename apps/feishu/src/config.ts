import type { GitHubConfig } from "./github.js";
import type { RelayConfig } from "./relay.js";

const defaultTaskLength = 6_000;

export type FeishuConfig = {
  appId: string;
  appSecret: string;
};

export type ServiceConfig = {
  feishu: FeishuConfig;
  github: GitHubConfig;
  relay: RelayConfig;
};

export function loadServiceConfig(environment: Record<string, string | undefined>): ServiceConfig {
  const maxTaskLength = readTaskLength(environment.MAX_TASK_LENGTH);
  const allowedOpenIds = new Set(
    (environment.FEISHU_ALLOWED_OPEN_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  if (allowedOpenIds.size === 0) {
    throw new Error("FEISHU_ALLOWED_OPEN_IDS must name at least one sender");
  }

  return {
    feishu: {
      appId: readRequired(environment, "FEISHU_APP_ID"),
      appSecret: readRequired(environment, "FEISHU_APP_SECRET"),
    },
    github: {
      apiUrl: readApiUrl(environment.GITHUB_API_URL),
      repository: readRepository(readRequired(environment, "GITHUB_REPOSITORY")),
      token: readRequired(environment, "GITHUB_DISPATCH_TOKEN"),
    },
    relay: {
      allowedOpenIds,
      maxTaskLength,
    },
  };
}

function readApiUrl(value: string | undefined): string {
  const apiUrl = value?.trim() || "https://api.github.com";
  const url = new URL(apiUrl);
  if (url.protocol !== "https:") {
    throw new Error("GITHUB_API_URL must use https");
  }
  return url.toString().replace(/\/$/, "");
}

function readRepository(value: string): string {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error("GITHUB_REPOSITORY must have the form owner/repository");
  }
  return value;
}

function readRequired(environment: Record<string, string | undefined>, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function readTaskLength(value: string | undefined): number {
  if (!value) {
    return defaultTaskLength;
  }
  const maxTaskLength = Number(value);
  if (!Number.isInteger(maxTaskLength) || maxTaskLength < 1 || maxTaskLength > 10_000) {
    throw new Error("MAX_TASK_LENGTH must be an integer between 1 and 10000");
  }
  return maxTaskLength;
}
