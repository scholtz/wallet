import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "child_process";

// In Docker builds, VITE_GIT_COMMIT/VITE_BUILD_DATE are supplied as build
// args (see docker/Dockerfile) since .dockerignore excludes .git, so `git`
// isn't available inside the build context. Outside Docker (local dev/build),
// fall back to reading the commit straight from the working tree.
//
// These are set on process.env (rather than passed via `define`) so they
// flow through Vite's built-in import.meta.env.VITE_* mechanism, which
// (unlike a custom `define` entry) is reliably substituted in both the dev
// server and the production build.
const isDockerBuild = !!process.env.VITE_GIT_COMMIT;
if (!process.env.VITE_GIT_COMMIT) {
  try {
    process.env.VITE_GIT_COMMIT = execSync("git rev-parse --short HEAD")
      .toString()
      .trim();
  } catch {
    process.env.VITE_GIT_COMMIT = "unknown";
  }
}
if (!process.env.VITE_BUILD_DATE) {
  process.env.VITE_BUILD_DATE = new Date().toISOString();
}
process.env.VITE_BUILD_SOURCE = isDockerBuild ? "docker" : "local";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    nodePolyfills({
      include: [
        "buffer",
        "crypto",
        "stream",
        "path",
        "util",
        "process",
        "vm",
        "url",
        "fs",
      ],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      filename: "service-worker.js",
      manifest: false, // Use existing manifest.json in public
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}"],
        globIgnores: ["**/*.xcf", "**/node_modules/**/*"],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "vue-i18n": "vue-i18n/dist/vue-i18n.esm-bundler.js",
      // libsodium-wrappers-sumo's published ESM build has a broken relative
      // import ("./libsodium-sumo.mjs") that doesn't resolve across packages.
      // Force the CJS build instead, which requires the bare "libsodium-sumo"
      // specifier and resolves correctly.
      "libsodium-wrappers-sumo": path.resolve(
        __dirname,
        "node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js"
      ),
    },
  },
  envPrefix: ["VITE_", "VUE_APP_"],
  define: {
    __INTLIFY_PROD_DEVTOOLS__: false,
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: true,
  },
  server: {
    port: 8080,
  },
  build: {
    outDir: "dist",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
