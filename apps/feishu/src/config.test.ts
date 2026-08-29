import { describe, expect, it } from "vitest";

import { loadServiceConfig } from "./config.js";

const environment = {
  FEISHU_ALLOWED_OPEN_IDS: "ou_first, ou_second",
  FEISHU_APP_ID: "cli_0123456789abcdef",
  FEISHU_APP_SECRET: "app-secret",
  GITHUB_DISPATCH_TOKEN: "github-token",
  GITHUB_REPOSITORY: "kaelen2026/linonward",
  HERMES_API_KEY: "hermes-api-key",
};

describe("loadServiceConfig", () => {
  it("loads the relay and GitHub configuration from environment variables", () => {
    expect(loadServiceConfig(environment)).toEqual({
      feishu: {
        appId: "cli_0123456789abcdef",
        appSecret: "app-secret",
      },
      github: {
        apiUrl: "https://api.github.com",
        ref: "main",
        repository: "kaelen2026/linonward",
        timeoutMs: 30_000,
        token: "github-token",
        workflow: "linonward-bot.yml",
      },
      hermes: {
        apiKey: "hermes-api-key",
        apiUrl: "http://host.docker.internal:8642/v1",
        model: "contentchief",
        timeoutMs: 30_000,
      },
      relay: {
        allowedOpenIds: new Set(["ou_first", "ou_second"]),
        maxTaskLength: 6_000,
      },
    });
  });

  it("requires a Hermes API key when a Hermes API URL is configured", () => {
    expect(() =>
      loadServiceConfig({
        ...environment,
        HERMES_API_KEY: undefined,
        HERMES_API_URL: "http://host.docker.internal:8642/v1",
      }),
    ).toThrow("HERMES_API_URL and HERMES_API_KEY must be configured together");
  });

  it("requires an allowlist instead of accepting messages from every user", () => {
    expect(() =>
      loadServiceConfig({
        ...environment,
        FEISHU_ALLOWED_OPEN_IDS: "  ",
      }),
    ).toThrow("FEISHU_ALLOWED_OPEN_IDS must name at least one sender");
  });

  it("requires the Feishu app secret needed for the long connection", () => {
    expect(() => loadServiceConfig({ ...environment, FEISHU_APP_SECRET: undefined })).toThrow(
      "FEISHU_APP_SECRET is required",
    );
  });
});
