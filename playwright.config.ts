import { defineConfig, devices } from "@playwright/test";

// Delay (ms) Playwright inserts before every action (click, fill, etc.) so a
// recorded video is slow enough to actually follow. Override locally with
// e.g. `STEP_DELAY_MS=0 npm run playwright:test` for a fast, delay-free run.
const stepDelayMs = process.env.STEP_DELAY_MS
  ? Number(process.env.STEP_DELAY_MS)
  : 1000;

// Spec files run in parallel workers (every test gets its own browser context, so IndexedDB,
// localStorage and mocked routes are isolated); tests inside one file stay sequential.
// Override with E2E_WORKERS=1 to debug ordering problems.
const requestedWorkers = Number.parseInt(process.env.E2E_WORKERS ?? "", 10);
const workers =
  Number.isInteger(requestedWorkers) && requestedWorkers > 0
    ? requestedWorkers
    : process.env.CI
      ? 3
      : 1;

export default defineConfig({
  testDir: "./playwright/e2e",
  fullyParallel: false,
  workers,
  // A stray test.only must never silently shrink the suite in CI.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:8080",
    // Full video of every test locally; in CI only keep it for failures.
    video: { mode: process.env.CI ? "retain-on-failure" : "on", size: { width: 1920, height: 1080 } },
    trace: "retain-on-failure",
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      slowMo: stepDelayMs,
    },
  },
  webServer: {
    command: "pnpm run serve --port 8080",
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
