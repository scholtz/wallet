declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// VITE_GIT_COMMIT/VITE_BUILD_DATE/VITE_BUILD_SOURCE are set on process.env by
// vite.config.ts (falling back to `git rev-parse` locally, or supplied as
// Docker build args — see docker/Dockerfile), then flow through automatically
// via Vite's built-in import.meta.env.VITE_* substitution.
interface ImportMetaEnv {
  readonly VITE_GIT_COMMIT: string;
  readonly VITE_BUILD_DATE: string;
  readonly VITE_BUILD_SOURCE: "docker" | "local";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
