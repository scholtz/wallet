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
    if (this.walletIsOpen) {
      this.initWc();
    }
  },
  computed: {
    theme() {
      return this.$store.state.config.theme;
    },
    walletIsOpen() {
      return this.$store.state.wallet.isOpen;
    },
  },
  watch: {
    theme() {
      this.applyTheme();
      setTimeout(() => {
        this.gradient.initGradient("#gradient-canvas");
      }, 100);
    },
    walletIsOpen(isOpen) {
      if (isOpen) {
        this.initWc();
      }
    },
  },
  methods: {
    ...mapActions({
      getConfig: "config/getConfig",
      setTheme: "config/setTheme",
      dispatchWcInit: "wc/init",
    }),
    applyTheme() {
      document.documentElement.classList.toggle(
        "p-dark",
        this.theme === "dark"
      );
    },
    async initWc() {
      // Bootstraps the WalletKit client + its session_request listener as soon
      // as the wallet is open, so incoming signature requests from already
      // approved DApp sessions are received (and the navbar badge updated)
      // regardless of which page the user is on. Previously this only ran
      // when the user visited /account/connect and clicked "Connect".
      if (this.$store.state.wc.web3wallet) return;
      try {
        await this.dispatchWcInit();
      } catch (e) {
        console.error("Failed to initialize WalletConnect", e);
      }
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
   see .language-footer below for that screen's language switcher. */
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

/* Auth screens (Login / NewWallet / ImportWallet): a single narrow
   glass card centered on the gradient, echoing the navbar's and
   .language-footer's blurred-translucent treatment so the three chrome
   surfaces on these screens read as one system. The auto margins on the
   panel (rather than relying on the container's justify-content-center
   alone) make centering overflow-safe: when the viewport is shorter than
   the form, auto margins collapse to 0 and the container scrolls from the
   top instead of clipping the panel's top edge off-screen. */
.auth-screen {
  overflow-y: auto;
  /* keep scrolled content clear of the absolute .language-footer */
  padding-bottom: 4.5rem;
}

/* On desktop the illustration and the auth panel sit side by side; on
   mobile only the panel is shown (see .auth-illustration below), so the
   content block never needs to be wider than the panel itself there. */
.auth-screen .auth-content {
  width: 100%;
  max-width: 64rem;
  margin-top: auto;
  margin-bottom: auto;
}

/* Photographic hero next to the auth panel (desktop only) — rendered as a
   card matching the glass panel's radius/border/shadow so the pair reads as
   one composition. Images are AI-generated, royalty-free (see
   src/assets/img/README.md for provenance and replacement guidance). */
/* Stretched wrapper + absolutely-filled img: the wrapper contributes no
   intrinsic height of its own (the img is out of flow), so the flex row's
   height is dictated solely by the auth panel, and the photo cover-crops
   to exactly match it — one two-column composition regardless of each
   image's native aspect ratio. Sizing is scoped to the lg breakpoint
   (matching the .hidden.lg:block on the <img> itself and .auth-content's
   lg:flex-row) because flex-basis applies along the flex axis: below lg,
   .auth-content is flex-column, so an unscoped "flex: 1 1 26rem" here would
   be read as a *height* basis and force the panel column that tall too,
   leaving a large blank gap under a short form (this happened in
   production — the fix is scoping, not just removing the illustration's
   own rule, since .auth-panel has the same footgun below). */
.auth-screen .auth-illustration {
  overflow: hidden;
}

.auth-screen .auth-illustration img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (min-width: 992px) {
  .auth-screen .auth-illustration {
    position: relative;
    flex: 1 1 24rem;
    max-width: 26rem;
    align-self: stretch;
    border-radius: var(--p-content-border-radius);
    border: 1px solid var(--p-content-border-color);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  }

  .auth-screen .auth-illustration img {
    position: absolute;
    inset: 0;
  }
}

.auth-screen .auth-panel {
  width: 100%;
  max-width: 30rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(16px);
  background: color-mix(in srgb, var(--p-content-background) 88%, transparent);
  overflow: hidden;
}

@media (min-width: 992px) {
  .auth-screen .auth-panel {
    flex: 1 1 30rem;
  }
}

/* Let the glass background above show through the Panel's own surfaces. */
.auth-screen .auth-panel .p-panel-header,
.auth-screen .auth-panel .p-panel-content {
  background: transparent;
  border: none;
}

.auth-screen .auth-panel .p-panel-header {
  font-family: var(--font-family-heading);
  font-size: 1.35rem;
  padding: 1.75rem 1.75rem 0.25rem;
}

.auth-screen .auth-panel .p-panel-content {
  padding: 0.75rem 1.75rem 1.75rem;
}

/* Inside the narrow auth card the app-wide "statement row" treatment
   (hairline separators between .field.grid rows) reads as clutter —
   plain stacked label-over-input rows instead. */
.auth-screen .auth-panel .field.grid {
  border-bottom: none;
  padding: 0.4rem 0;
}

.auth-screen .auth-panel label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.auth-screen .auth-panel .auth-help {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* Language switcher on the Login/New-Wallet screens, pinned to the bottom
   of the (relatively-positioned) centering container as its own translucent
   footer bar — same blurred-glass treatment as the sticky navbar — instead
   of sitting inline below the auth Panel and competing with it for vertical
   centering. */
.language-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  backdrop-filter: blur(10px);
  background-color: color-mix(
    in srgb,
    var(--p-content-background) 80%,
    transparent
  );
  border-top: 1px solid var(--p-content-border-color);
}

/* Responsive QR codes: qrcode-vue3 renders a raster <img> from a data URL
   at the natural pixel size given via :width (275-500px across the app)
   with no sizing attributes of its own, so on narrow phone screens the
   image overflows the viewport and forces horizontal scrolling (most
   visibly the 400px account QR on the page shown right after login).
   Every <QRCodeVue3> in the app passes imgclass="qr-code": the generated
   bitmap keeps its resolution (scan quality) but never renders wider than
   its container. */
img.qr-code {
  max-width: 100%;
  height: auto;
}

/* Long single-token strings (encoded payment URIs, 25-word mnemonics,
   58-char Algorand addresses) rendered in <code> blocks (ReceivePayment,
   Export, ...) cannot wrap and force horizontal scrolling on mobile. */
code {
  overflow-wrap: anywhere;
}

/* Same escape hatch for long tokens in non-code inline elements
   (e.g. the donation address link). */
.break-anywhere {
  overflow-wrap: anywhere;
  word-break: break-all;
}

/* Wide DataTables (transactions, asset lists...) scroll inside their own
   container instead of stretching the whole page horizontally on mobile.
   PrimeVue v4 only gives .p-datatable-table-container `position: relative`
   unless the table is `scrollable`, so a table wider than a phone viewport
   otherwise forces page-level horizontal scrolling. */
.p-datatable-table-container {
  overflow-x: auto;
}

/* Bolded Panel headers: several Panels (Login/NewWallet/ImportWallet/...)
   supply the #header slot as plain text rather than via the scoped
   `:class` the slot exposes (which would apply .p-panel-title, already
   bold via a design token) — so their header text rendered unbolded at
   regular body weight. Bolding .p-panel-header directly covers both
   cases without touching every individual Panel's header markup. */
.p-panel-header {
  font-weight: 700;
}
</style>
