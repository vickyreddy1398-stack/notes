import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:5173", ...devices["Desktop Chrome"] },
  webServer: [
    {
      command: "pnpm dev",
      cwd: "../api",
      url: "http://127.0.0.1:3001/api/trpc/health.ping",
      reuseExistingServer: true,
    },
    {
      command: "pnpm dev --host 127.0.0.1",
      cwd: ".",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
    },
  ],
});
