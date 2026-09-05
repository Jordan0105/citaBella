import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const OWNER_STATE = path.join(process.cwd(), ".playwright", "owner.json");

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.mjs",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-NI",
    timezoneId: "America/Managua",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], storageState: OWNER_STATE },
      dependencies: ["setup"],
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], storageState: OWNER_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
