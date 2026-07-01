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

/* Content surface for routed pages that don't wrap themselves in a Card
   (most of them). Without this, page content sits directly on the
   transparent animated gradient background, which both looks like a
   "missing panel" and breaks text/button colors calibrated for a solid
   surface (e.g. secondary-severity link buttons become nearly invisible
   against the teal gradient). Applied in layouts/Main.vue (wallet-open
   branch) and layouts/Public.vue. Not applied to the wallet-closed Login
   branch of Main.vue, which manages its own centered/Panel'd layout —
   see .link-strip below for that screen's equivalent fix. */
.page-shell {
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  /* Vertical rhythm only: #app already carries a horizontal m-2 (see
     index.html) that both the navbar and this shell live inside, so a left/
     right margin here on top of that would inset the content further than
     the navbar above it and make the navbar look wider than the page. */
  margin: 1rem 0;
}

/* Many pages wrap their own content in a top-level <Card> (e.g. Accounts.vue,
   AccountOverview.vue) in addition to sitting inside .page-shell above, which
   produced a visible "card inside a card": the Card's own background/border/
   shadow doubled up on the shell's, and its .p-card-body padding stacked on
   top of the shell's padding, so a heading rendered as a page-shell sibling
   (flush with the shell's own padding) no longer lined up with the Card's
   indented content directly below it. Flattening a Card that's a direct
   child of .page-shell into a plain content block (no competing background/
   border/shadow, no extra padding of its own) makes it inherit the shell's
   single surface and padding instead of layering a second one — one visual
   card per page, however many the page's own markup nests. Doesn't affect
   header/content internal spacing (that's `.p-card-body`'s `gap`, untouched)
   or Cards nested deeper than a direct shell child. */
.page-shell > .p-card {
  background: transparent;
  box-shadow: none;
  border: none;
  border-radius: 0;
}

.page-shell > .p-card > .p-card-body {
  padding: 0;
}

/* Small opaque strip for content that intentionally lives outside a page's
   main Card/Panel (e.g. the language-flag row and footer links below the
   login/new-wallet forms) so it isn't rendered directly on the transparent
   gradient background. */
.link-strip {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 0.75rem 1rem;
}
</style>
