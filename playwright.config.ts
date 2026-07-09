import { defineConfig, devices } from "@playwright/test";

// Delay (ms) Playwright inserts before every action (click, fill, etc.) so a
// recorded video is slow enough to actually follow. Override locally with
// e.g. `STEP_DELAY_MS=0 npm run playwright:test` for a fast, delay-free run.
const stepDelayMs = process.env.STEP_DELAY_MS
  ? Number(process.env.STEP_DELAY_MS)
  : 1000;

export default defineConfig({
  testDir: "./playwright/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 120000,
  use: {
    baseURL: "http://localhost:8080",
    video: { mode: "on", size: { width: 1920, height: 1080 } },
    trace: "retain-on-failure",
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      slowMo: stepDelayMs,
    },
  },
  webServer: {
    command: "npm run serve -- --port 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        // devices["Desktop Chrome"] ships its own 1280x720 viewport, which
        // would silently override the 1920x1080 one set above - re-assert
        // it last so the browser content actually fills the recorded frame.
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
