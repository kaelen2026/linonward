import { describe, expect, it } from "vitest";

import { loadApiConfig } from "./config.js";

describe("loadApiConfig", () => {
  it("serves on port 3001 so it does not collide with the website", () => {
    expect(loadApiConfig({})).toEqual({
      allowedOrigins: [],
      host: "0.0.0.0",
      port: 3001,
      version: "0.0.0",
    });
  });

  it("reads the port and version the deployment assigns", () => {
    expect(loadApiConfig({ API_VERSION: "1.4.0", PORT: "8080" })).toMatchObject({
      port: 8080,
      version: "1.4.0",
    });
  });

  it("rejects a port outside the range a socket can bind", () => {
    expect(() => loadApiConfig({ PORT: "70000" })).toThrow(
      "PORT must be an integer between 1 and 65535",
    );
  });

  it("splits the browser origins allowed to call the API", () => {
    expect(
      loadApiConfig({ CORS_ALLOWED_ORIGINS: "https://linonward.com, http://localhost:3000 , " }),
    ).toMatchObject({
      allowedOrigins: ["https://linonward.com", "http://localhost:3000"],
    });
  });

  it("rejects an allowed origin carrying a path, which no browser ever sends", () => {
    expect(() => loadApiConfig({ CORS_ALLOWED_ORIGINS: "https://linonward.com/zh" })).toThrow(
      "CORS_ALLOWED_ORIGINS must list bare http(s) origins",
    );
  });
});
