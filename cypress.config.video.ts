import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8083",
    supportFile: "cypress/support/e2e.ts",
    video: true,
    testIsolation: true,
  },
});
