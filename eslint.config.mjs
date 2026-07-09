import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";

// Several older Options-API components in this project use plain, untyped
// <script> blocks (no lang attribute). Allow both so vue/block-lang doesn't
// force every legacy .vue file into strict TS typing.
configureVueProject({ scriptLangs: ["ts", "js"] });

export default defineConfigWithVueTs(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "cypress/videos/**",
      "cypress/screenshots/**",
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
      "playwright/.cache/**",
      "k8s/conf/**",
      "k8s/stable/**",
      "scripts/check-locales.js",
      "scripts/run-tests.js",
    ],
  },
  js.configs.recommended,
  pluginVue.configs["flat/essential"],
  vueTsConfigs.base,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "vue/multi-word-component-names": "off",
      "vue/no-reserved-component-names": "off",
    },
  }
);
