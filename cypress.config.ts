import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8083",
    supportFile: false,
    video: true,
    testIsolation: true,
  },
});
