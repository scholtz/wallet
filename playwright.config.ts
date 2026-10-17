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
      ? 4
      : 1;

// In CI (or with E2E_PROD=1) the suite tests the built bundle (vite build + vite preview) instead
// of the unbundled dev server; E2E_PROD=0 forces the dev server. Every popup/tab/context otherwise re-downloads and transforms thousands of dev modules,
// which is what made the suite crawl on small CI runners.
const serveProduction =
  process.env.E2E_PROD === "1" ||
  (!!process.env.CI && process.env.E2E_PROD !== "0");

const DEV_SERVER_SPECS = /liquid-initialization\.spec\.ts$/;

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
    // Full video of every test locally. Not in CI: even "retain-on-failure" records every test, and
    // finalising 1920x1080 videos on a small runner stalls browserContext.close for minutes (the
    // test body is long done) - traces below are the CI debugging artifact. E2E_VIDEO overrides.
    video: {
      mode: (process.env.E2E_VIDEO as "on" | "off" | undefined) ?? (process.env.CI ? "off" : "on"),
      size: { width: 1920, height: 1080 },
    },
    trace: "retain-on-failure",
    // The PWA service worker (registered in production builds only) must not intercept requests
    // behind page.route() mocks or cache across tests.
    serviceWorkers: "block",
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      slowMo: stepDelayMs,
    },
  },
  webServer: serveProduction
    ? [
        {
          command:
            "pnpm exec vite build && pnpm exec vite preview --port 8080 --strictPort",
          url: "http://localhost:8080",
          reuseExistingServer: !process.env.CI,
          timeout: 180000,
        },
        // liquid-initialization.spec.ts imports source modules and mocks socket.io-client by their
        // dev-server URLs, which do not exist in a bundle: it runs against the Vite dev server.
        {
          command: "pnpm run serve --port 8081 --strictPort",
          url: "http://localhost:8081",
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
      ]
    : {
        command: "pnpm run serve --port 8080",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
  projects: [
    {
      name: "chromium",
      // Dev-server-only spec (see webServer); everything else runs on the main server.
      testIgnore: serveProduction ? DEV_SERVER_SPECS : undefined,
      use: {
        // devices["Desktop Chrome"] ships its own 1280x720 viewport, which
        // would silently override the 1920x1080 one set above - re-assert
        // it last so the browser content actually fills the recorded frame.
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    ...(serveProduction
      ? [
          {
            name: "chromium-dev-server",
            testMatch: DEV_SERVER_SPECS,
            use: {
              ...devices["Desktop Chrome"],
              viewport: { width: 1920, height: 1080 },
              baseURL: "http://localhost:8081",
            },
          },
        ]
      : []),
  ],
});
