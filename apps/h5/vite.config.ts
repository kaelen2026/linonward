import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiOrigin = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : undefined;
  return {
    plugins: [
      react(),
      {
        name: "linonward-csp",
        transformIndexHtml(html) {
          const sources = ["'self'"];
          if (command === "serve") sources.push("ws://localhost:3003");
          if (apiOrigin) sources.push(apiOrigin);
          return html.replace("__CONNECT_SOURCE__", sources.join(" "));
        },
      },
    ],
    base: "./",
    build: {
      target: "es2022",
    },
    server: {
      proxy: {
        "/api": "http://localhost:3001",
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});
