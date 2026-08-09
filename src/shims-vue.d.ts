/* eslint-disable */
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // `any` is Vue's own official shim signature for untyped SFC imports: many
  // components in this repo are legacy Options API / loose-JS `.vue` files
  // (see CLAUDE.md's ESLint/vue-tsc notes) whose Data shape can't be known
  // generically here, and DefineComponent has no "unknown Data" alternative.
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

import type { ComponentCustomProperties } from "vue";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import type { Store } from "vuex";
import type { RootState } from "./store";
import type { ComposerTranslation } from "vue-i18n";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $store: Store<RootState>;
    $router: Router;
    $route: RouteLocationNormalizedLoaded;
    $t: ComposerTranslation;
  }
}

declare module "qrcode-reader-vue3";
