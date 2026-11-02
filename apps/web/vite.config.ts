import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The URL prefix the app is served under (BASE_PATH, e.g. "/napm-azure/"); "/" in dev and tests.
  base: process.env.BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": "http://localhost:3001" } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
