import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "ere9gz",
  e2e: {
    baseUrl: "http://localhost:8080",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    testIsolation: false, // Disable test isolation for better compatibility
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000,
  },

  setupNodeEvents(on) {
    on("before:browser:launch", (browser, launchOptions) => {
      if (browser.family === "chromium" && browser.name !== "electron") {
        launchOptions.preferences.default.intl = { accept_languages: "en" };
        return launchOptions;
      }
    });
  },
});
