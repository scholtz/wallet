import { defineConfig } from "@playwright/test";

// Config for pure Node unit tests (playwright/unit/*.spec.ts) - tests of
// browser-free logic imported straight from src/. Unlike playwright.config.ts
// there is deliberately no webServer, no browser project, no video and no
// slowMo: these specs never touch a page, so they run in milliseconds.
export default defineConfig({
  testDir: "./playwright/unit",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 30000,
});
