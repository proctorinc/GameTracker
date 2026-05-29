import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "3100");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      `APP_ENV=test NEXT_PUBLIC_APP_ENV=test AUTH_MOCK_OTP=123456 PORT=${PORT} npm run db:migrate && APP_ENV=test NEXT_PUBLIC_APP_ENV=test AUTH_MOCK_OTP=123456 PORT=${PORT} npm run db:seed && APP_ENV=test NEXT_PUBLIC_APP_ENV=test AUTH_MOCK_OTP=123456 PORT=${PORT} npm run dev:next -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
