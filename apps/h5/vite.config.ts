import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: "linonward-csp",
      transformIndexHtml(html) {
        const connectSource = command === "serve" ? "'self' ws://localhost:3003" : "'self'";
        return html.replace("__CONNECT_SOURCE__", connectSource);
      },
    },
  ],
  base: "./",
  build: {
    target: "es2022",
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}));
