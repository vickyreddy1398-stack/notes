import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.browser.spec.ts",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: [
    {
      command: "pnpm --dir /work/repo --filter api dev",
      url: "http://127.0.0.1:3001/health",
      reuseExistingServer: false,
    },
    {
      command: "pnpm --dir /work/repo --filter web dev --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
  ],
});
