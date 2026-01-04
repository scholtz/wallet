/* eslint-disable */
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

import type { ComponentCustomProperties } from "vue";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import type { Store } from "vuex";
import type { RootState } from "./store";

type TranslatorFunction = (key: string, ...params: unknown[]) => string;

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $store: Store<RootState>;
    $router: Router;
    $route: RouteLocationNormalizedLoaded;
    $t: TranslatorFunction;
  }
}

declare module "qrcode-reader-vue3";
