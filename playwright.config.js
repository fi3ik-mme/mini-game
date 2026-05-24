import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3456",
    headless: true,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx -y serve . -p 3456",
        url: "http://127.0.0.1:3456",
        reuseExistingServer: true,
      },
});
