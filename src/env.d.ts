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
  /** Comma-separated extra Liquid Auth service hosts a self-hosted wallet trusts. */
  readonly VITE_LIQUID_SERVICE_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
