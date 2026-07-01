<template>
  <canvas id="gradient-canvas"></canvas>
  <router-view />
</template>

<script>
import { mapActions } from "vuex";
import { Buffer } from "buffer";
// @ts-ignore
window.Buffer = Buffer;

// fix old wallet connect library
// @ts-ignore
window.global ||= window;
// fix new wallet connect library
// @ts-ignore
window.process = {
  env: {},
  version: "",
};
import wc from "./shared/wc";
import { Gradient } from "whatamesh";

export default {
  name: "App",
  async created() {
    wc.initialize(this.$store);
    await this.getConfig();
    await this.setTheme();
  },
  data() {
    return {
      gradient: null,
    };
  },
  mounted() {
    this.applyTheme();
    this.gradient = new Gradient();
    setTimeout(() => {
      this.gradient.initGradient("#gradient-canvas");
    }, 100);
  },
  computed: {
    theme() {
      return this.$store.state.config.theme;
    },
  },
  watch: {
    theme() {
      this.applyTheme();
      setTimeout(() => {
        this.gradient.initGradient("#gradient-canvas");
      }, 100);
    },
  },
  methods: {
    ...mapActions({
      getConfig: "config/getConfig",
      setTheme: "config/setTheme",
    }),
    applyTheme() {
      document.documentElement.classList.toggle(
        "p-dark",
        this.theme === "dark"
      );
    },
  },
};
</script>

<style>
th,
td {
  vertical-align: top;
}

/* Typography. Nothing in the app set a font-family at all after the
   PrimeVue v4 migration removed the old vendored theme CSS (which used to
   bundle "Inter var" and apply it broadly) — every element was silently
   falling back to the browser's serif default (Times New Roman). Body copy
   uses Inter (readable, tabular figures for on-chain amounts); headings use
   Space Grotesk for a more distinct, modern/crypto-native feel. Both are
   self-hosted via @fontsource-variable (see main.ts) — no external font
   requests from a wallet that otherwise makes no third-party calls. */
:root {
  --font-family-body: "Inter Variable", "Inter", -apple-system,
    BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-heading: "Space Grotesk Variable", "Space Grotesk",
    var(--font-family-body);
}

html,
body {
  font-family: var(--font-family-body);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--font-family-heading);
  letter-spacing: -0.01em;
}

/* Bridges the old theme-CSS variable name (still used by the inline brand
   SVGs) to PrimeVue v4's design-token variable, so the logo tracks the
   Biatec preset's primary color without editing every inlined SVG. */
:root {
  --primary-color: var(--p-primary-color);

  /* whatamesh animated background, tuned to the Biatec teal brand */
  --gradient-color-1: #14b8a6;
  --gradient-color-2: #0d9488;
  --gradient-color-3: #5eead4;
  --gradient-color-4: #0f766e;
}

html.p-dark {
  --gradient-color-1: #0f766e;
  --gradient-color-2: #134e4a;
  --gradient-color-3: #2dd4bf;
  --gradient-color-4: #042f2e;
}

/* Fixed full-viewport backdrop, behind all routed content (which stays in
   normal document flow and scrolls over it) instead of a static block that
   pushes the page down. */
#gradient-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}

/* Cards float above the animated background instead of blending into it. */
.p-card {
  box-shadow: var(--p-card-shadow, 0 4px 24px rgba(0, 0, 0, 0.12));
  border: 1px solid var(--p-content-border-color);
}

/* App-wide "label: value" data rows (used on nearly every page via the
   .field.grid + .font-bold convention) get a statement-like treatment:
   muted labels, a hairline separator between rows, and no double-bold
   fight between the label and its value. */
.field.grid {
  margin: 0;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--p-content-border-color);
}

.field.grid:last-of-type {
  border-bottom: none;
}

.field.grid > label.font-bold {
  color: var(--p-text-muted-color);
  font-weight: 600;
  letter-spacing: 0.01em;
}
</style>
