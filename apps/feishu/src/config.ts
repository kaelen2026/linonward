import type { GitHubConfig } from "./github.js";
import type { RelayConfig } from "./relay.js";

const defaultTaskLength = 6_000;
const defaultHermesApiUrl = "http://host.docker.internal:8642/v1";
const defaultHermesModel = "contentchief";

export type FeishuConfig = {
  appId: string;
  appSecret: string;
};

export type ServiceConfig = {
  feishu: FeishuConfig;
  github: GitHubConfig;
  hermes?: HermesConfig;
  relay: RelayConfig;
};

export type HermesConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
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
      ref: environment.GITHUB_WORKFLOW_REF?.trim() || "main",
      repository: readRepository(readRequired(environment, "GITHUB_REPOSITORY")),
      token: readRequired(environment, "GITHUB_DISPATCH_TOKEN"),
      workflow: environment.GITHUB_WORKFLOW?.trim() || "linonward-bot.yml",
    },
    hermes: loadHermesConfig(environment),
    relay: {
      allowedOpenIds,
      maxTaskLength,
    },
  };
}

function loadHermesConfig(
  environment: Record<string, string | undefined>,
): HermesConfig | undefined {
  const apiUrl = environment.HERMES_API_URL?.trim();
  const apiKey = environment.HERMES_API_KEY?.trim();

  if (apiUrl && !apiKey) {
    throw new Error("HERMES_API_URL and HERMES_API_KEY must be configured together");
  }
  if (!apiKey) {
    return undefined;
  }

  const url = new URL(apiUrl || defaultHermesApiUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("HERMES_API_URL must use http or https");
  }

  return {
    apiKey,
    apiUrl: url.toString().replace(/\/$/, ""),
    model: environment.HERMES_MODEL?.trim() || defaultHermesModel,
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
