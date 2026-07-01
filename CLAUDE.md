# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AWallet — an open-source Algorand cryptocurrency wallet built with Vue 3 + TypeScript, using PrimeVue for UI, Vuex for state, Vite for build/dev, and algosdk for chain interaction. Ships as a static SPA (deployed to K8S, GitHub Pages, and Vercel from the same build).

## Commands

- Install: `CYPRESS_INSTALL_BINARY=0 npm install` (skips Cypress binary download, which often fails on restricted networks)
- Dev server: `npm run serve` (Vite, http://localhost:8080)
- Build: `npm run build` (runs `vue-tsc --noEmit` type-check then `vite build` into `dist/`)
- Lint (with autofix): `npm run lint`
- Type-check only: `npm run check-typescript-errors-tsc` (plain tsc) or `npm run check-typescript-errors-vue` (vue-tsc, checks .vue files too)
- Locale parity check: `npm run check-locales` (builds `scripts/*.ts` then runs the compiled `scripts/check-locales.js`; verifies every `src/locales/*.json` has the same keys, in the same order, as `en.json`)
- Serve production build: `npm run build` then `npm run server` (browser-sync on port 8080)

### Testing (Cypress E2E)

Cypress requires its binary, which frequently fails to install in sandboxed/restricted environments — don't assume `npm run test` works without checking first.

`scripts/run-test-with-server.js` and `scripts/run-tests.js`/`run-tests.ts` locate the Cypress binary cache cross-platform (Windows `%LOCALAPPDATA%\Cypress\Cache`, macOS `~/Library/Caches/Cypress`, Linux `~/.cache/Cypress`) — both were fixed to agree on this (previously `run-test-with-server.js` only checked the Linux path and false-negatived on Windows). Even with the binary present, `npx cypress run ...` can still fail in a sandboxed/headless Windows environment with `Cypress.exe: bad option: --smoke-test` (the sandboxed `.exe` isn't the real Cypress binary, and this reproduces identically via `npx cypress install` + direct invocation in both Git Bash and native PowerShell). If you hit that, don't keep retrying Cypress — fall back to a plain Node `.mjs` script exercising the underlying logic directly (e.g. algosdk + the relevant `src/scripts/` helper) for verification instead.

- Run full suite: `npm run test` (compiles scripts then runs `scripts/run-tests.js`)
- Run a single spec against an auto-started server: `node scripts/run-test-with-server.js cypress run --config-file cypress.config.video.ts --spec 'cypress/e2e/<path>/<file>.cy.ts'`
  - Predefined single-spec scripts: `npm run test:arc76`, `npm run test:ed25519`, `npm run test:hd-wallet`, `npm run test:basic`
- Interactive: `npm run test:open` (starts server + opens Cypress UI)
- Specs live under `cypress/e2e/<n-category>/*.cy.ts`, numbered by test phase (e.g. `1-basic-tests`, `2-setup-account`).

There is no unit test runner in this repo — correctness is verified via type-checking, lint, and Cypress E2E flows.

## Architecture

### State: Vuex, one module per concern

`src/store/index.ts` composes the root store from modules in `src/store/*.ts` (e.g. `wallet`, `signer`, `algod`, `indexer`, `axios`, `config`, `wc`/`wcClient` for WalletConnect, `arc14`, `fa2`, `vote`, `participation`, `publicData`, `toast`). Each module exports its own `<Name>State` type, aggregated into `RootState`. Use `useStore()` from `@/store` (not raw Vuex `useStore`) to get typed store access in components.

### Multi-wallet / multi-account model

The app supports multiple wallets, each holding multiple accounts of different key types: plain ed25519, ARC-76 (deterministic key derivation), HD (ARC-52/BIP32-Ed25519), multisig, Ledger hardware, and rekeyed accounts. Wallets are encrypted client-side (password-protected) and persisted via Dexie (IndexedDB) — there is no backend; all key material stays local. When touching account/wallet logic, check `src/store/wallet.ts` and `src/store/signer.ts` together, since signing dispatches by account type.

#### HD wallets (ARC-52 / BIP32-Ed25519)

`WalletAccount.type === "hd"` accounts come in two flavors, distinguished by whether `hdMnemonic` is set:
- **Root** (created via "create/import HD wallet"; `hdAccountIndex` defaults to 0 but is user-choosable at creation, e.g. to recover a non-default iteration as the wallet's first tracked account): stores the 24-word BIP-39 `hdMnemonic` in-place (same trust model as `sk` on other account types — the whole wallet blob is AES-encrypted before persisting, so this is not a new exposure).
- **Derived** (`hdAccountIndex: N`, created via "generate next account"): has no `sk` and no `hdMnemonic` — only `hdRootAddr` (pointing at the root account holding the mnemonic) and `hdAccountIndex`. Signing/backup always re-derive from the root's mnemonic at use time; there is no independent secret to export for a derived-only account.

Derivation uses `@algorandfoundation/xhd-wallet-api` (official Algorand Foundation ARC-52 implementation) via `src/scripts/encoding/hdWallet.ts`, fixed to path `m'/44'/283'/account'/0/keyIndex` (we only vary `account'`, our "iteration", and fix `keyIndex = 0`). Two non-obvious gotchas if you touch this code:
- The bytes to sign for a transaction must be `tx.bytesToSign()` (algosdk's `TX`-tag-prefixed msgpack), **not** `tx.toByte()` — `signAlgoTransaction()` does not add the prefix itself.
- The library depends on `libsodium-wrappers-sumo` and Node's `crypto.createHash`/`createHmac`; the latter works in-browser already because `vite.config.ts`'s `nodePolyfills` include list already covers `crypto`. The former needed a `resolve.alias` in `vite.config.ts` pointing `libsodium-wrappers-sumo` at its CJS build — the package's published ESM build (`dist/modules-sumo-esm/libsodium-wrappers.mjs`) has a broken relative import (`./libsodium-sumo.mjs`) that doesn't resolve across the separate `libsodium-sumo` package, which breaks `vite build` (dev server works fine via esbuild's more lenient resolution — this only surfaces in the production Rollup build).

Because BIP32-Ed25519 derived keys are not standard NaCl seeds, hd accounts are incompatible with `algosdk.secretKeyToMnemonic`/`signTxn`/Shamir-of-`sk` flows that other account types use — `signer.ts` has a dedicated `signByHd` action instead of reusing `signBySk`.

### Chain access layer

`src/store/algod.ts` and `src/store/indexer.ts` wrap algosdk clients for node/indexer calls; `src/store/axios.ts` and `arc14.ts` handle authenticated HTTP (ARC-14 signed-request auth) to external services. Network selection (Mainnet/etc.) lives in `src/store/config.ts` and fans out to these modules.

### WalletConnect / DApp connectivity

`src/store/wc.ts` (session/request state) and `src/store/wcClient.ts` (the underlying WalletConnect v2 client) implement DApp-facing signing — a wallet acting as a WalletConnect signer for external DApp requests.

### Routing and pages

`src/router/index.ts` defines routes; page components live under `src/pages/<Area>/` (e.g. `Account/`, `Asset/`, `Arc200/`, `NewAccount/`, `Wallet/`, `governance/`). Reusable UI is in `src/components/` (with `account/` and `tools/` subfolders); composables in `src/composables/`.

There are **two distinct, independent navigation surfaces** for account-scoped links — a "link to X from the account page" request usually means both:
- `src/components/Navbar2.vue`: the app's actual top navbar dropdown. Its account-scoped submenu (Pay, Rekey, Export, etc.) is built dynamically inside `makeMenu()`, keyed off `store.state.wallet.lastActiveAccount`.
- `src/components/AccountTopMenu.vue`: the `TabMenu` row (Overview/Actions/Assets/Transactions) shown at the top of every `Account/*` page, built once in `<script setup>` off `route.params.account`.

To gate an item to accounts of a given `type` (e.g. `"hd"`) in either file, spread a conditional array literal into the items list: `...(store.state.wallet.privateAccounts.find((a) => a.addr === <addr>)?.type === "hd" ? [{ ...item }] : [])`.

New account-type-specific pages generally need an entry point in *three* places to be reachable the way existing features are: the relevant `Actions.vue`/page body, `AccountTopMenu.vue`, and `Navbar2.vue`.

### Non-Vue logic

Chain-adjacent utilities that aren't Vue-specific live under `src/scripts/` (`encoding/`, `numbers/`, `aggregators/`, `interface/`, `dexAggregators.ts`) and `src/workers/` (web workers, e.g. for heavy crypto operations off the main thread). Prefer putting new pure logic here rather than in components/store.

### Localization

`src/locales/en.json` is the source of truth. Every other locale file (`af`, `cs`, `es`, `hu`, `it`, `nl`, `ru`, `sk`, `tr`) must have identical keys in identical order, 2-space indented, newline at EOF. Run `npm run check-locales` (`scripts/check-locales.js`) to verify this deterministically instead of hand-writing a comparison script each time.

All locale JSON files use CRLF (`\r\n`) line endings. If you script inserting a new key across all files (e.g. a Node one-liner with an anchor-based regex), match `\r?\n`, not just `\n` — the `\n`-only version silently inserts nothing on every file and looks like it succeeded.

8 of the 9 non-English locales (all except `af`, which is largely untranslated) are substantially real-translated already. Prefer providing an actual translation for new keys over the English placeholder — an English-only string stands out as a bug to a user on a fully-localized screen. Only use the English value as a placeholder when you genuinely can't produce a reasonable translation.

### UI stack: PrimeVue 4 + Tailwind (prefixed) + PrimeFlex

The app was migrated from PrimeVue 3 to PrimeVue 4 (`primevue: ^4.5.5`, theme package `@primeuix/themes`). Theming is a custom Aura-based preset (teal brand, `#14b8a6` light / `#2dd4bf` dark) defined via `definePreset` in `src/main.ts`, configured with `darkModeSelector: ".p-dark"`. There is **no more runtime theme-CSS-file switching** (the old `public/themes/`/`public/custom-themes/` + `<link id="theme-link">` mechanism and PrimeVue's `changeTheme()` API are gone) — light/dark is a single class toggle on `<html>`, driven by `store/config.ts`'s `theme` state (`"light" | "dark"`) and applied in `App.vue`'s `applyTheme()`. The old "78 preset themes" picker in `Navbar2.vue` was replaced by a single sun/moon toggle button (`.theme-toggle`, in the Menubar's `#end` slot).

Tailwind CSS v4 is installed (`src/assets/tailwind.css`) but **only for new/redesigned chrome markup**, not as a replacement for PrimeFlex (which is still used across ~75 files for layout and stays). Two non-obvious setup requirements, both already handled in `src/assets/tailwind.css` — don't redo this if asked to touch Tailwind config again:
- **Must use a class prefix** (`prefix(tw)`, so utilities are `tw:flex` not `flex`) so Tailwind's utility class names can never collide with PrimeFlex's near-identical ones (`.flex`, `.gap-2`, `.hidden`, `.p-2`, etc. exist in both with different specificity/values).
- **Must skip Preflight** (Tailwind's base-element CSS reset). Preflight is *not* prefix-scoped — even with `prefix(tw)`, importing the `"tailwindcss"` shorthand still injects an unprefixed global reset of raw elements (`img`, `button`, headings, lists...) that silently breaks plain HTML everywhere else in the app (concretely: it overrode `<img height="50">` flag icons to `height: auto`, blowing them up to full container width). Fix/pattern: import `tailwindcss/theme.css` + `tailwindcss/utilities.css` directly (with `layer()`/`prefix()`) instead of the `"tailwindcss"` shorthand, omitting `tailwindcss/preflight.css` entirely.

If you ever add PrimeVue components/pages, remember the v3→v4 renames already applied app-wide (don't reintroduce the old names): `Dropdown`→`Select`, `InputSwitch`→`ToggleSwitch`. Other v3→v4 changes hit during the migration:
- `primevue/api` no longer exists — `PrimeIcons`, `FilterMatchMode`, etc. now live at `@primevue/core/api`.
- Legacy `TabView`/`TabPanel` (still present in v4 for backward compat, not yet migrated to the new `Tabs`/`TabList`/`Tab`/`TabPanels` API) now requires each `<TabPanel>` to have a `value` prop (e.g. `value="0"`, `value="1"` matching position) — omitting it is a type error and breaks panel switching.
- `@primeuix/themes/aura` (and other deep-path theme imports) fail to type-check under `tsconfig.json`'s `moduleResolution: "node"` (classic resolution ignores package `exports` maps for subpaths). **Don't "fix" this by switching to `moduleResolution: "bundler"`** — that broke `vuex`'s type resolution repo-wide instead (vuex's `exports` map isn't set up for bundler resolution either). The actual fix is a targeted `paths` alias in `tsconfig.json` pointing the specific subpath at its `.d.ts` file directly; Vite's own resolution (used for the real build) is unaffected either way since tsconfig only governs `vue-tsc` type-checking.

**If you build a custom PrimeVue item/content template** (e.g. `Menubar`'s `#item` slot, as `Navbar2.vue` does to support `RouterLink`-based nav items with icons/badges/shortcuts): you must manually apply the *current* version's real internal class names, and actually bind the `props` object the slot gives you — don't guess/reuse old class names. Concretely, `Menubar`'s per-item slot exposes `props.action` (an object literal carrying the real `class: 'p-menubar-item-link'` plus ARIA/tabindex attrs) that has to be spread with `v-bind="props.action"` onto *every* branch of your custom template (a previous pass here only bound it on the plain-`<a>` fallback branch and not on the `RouterLink` branch, which is what almost every real menu item uses — the result was default unstyled/underlined browser links across the entire nav, a very visible regression). The current real class names for Menubar internals (verify via `node_modules/primevue/menubar/index.mjs` + `node_modules/@primeuix/styles/dist/menubar/index.mjs` if they've changed again): `p-menubar-item-link` (the `<a>`), `p-menubar-item-icon`, `p-menubar-item-label`, `p-menubar-submenu-icon`, `p-menubar-submenu` (nested dropdown `<ul>`, not `p-submenu-list` — that's the old v3 name). When a PrimeVue-styled page looks "unstyled" (default blue/underlined links, no spacing) after a version bump, suspect exactly this class-name-drift pattern before assuming the theme/CSS pipeline itself is broken — check computed styles / injected `<style data-primevue-style-id="...">` tags first to rule that out cheaply.

Other design-system notes:
- `#gradient-canvas` (the `whatamesh` animated background in `App.vue`) is `position: fixed; inset: 0; z-index: -1` — a full-viewport backdrop behind all routed content, which stays in normal document flow and scrolls over it. Don't remove that positioning "to simplify" — without it the canvas is a static block element that pushes page content down instead of sitting behind it.
- App-wide "label: value" rows use the `.field.grid` + `label.font-bold` PrimeFlex convention (present on nearly every page). `App.vue`'s global `<style>` adds a hairline `border-bottom` + muted label color to this pattern once, globally — prefer extending that global rule over hand-styling individual pages' field rows.
- Language flags (`Login.vue`, `NewWallet.vue`, `Merchant.vue`, `Settings.vue`) come from the `flag-icons` npm package, imported **per-file as individual SVGs** in `src/scripts/localeFlags.ts` (`import gb from "flag-icons/flags/4x3/gb.svg"` etc.) via a small `<LanguageFlag :locale>` component — not via the package's bundled `flag-icons.css`, which references all ~270 flags through CSS `url()` and makes Vite bundle every flag regardless of which ones are actually used (confirmed via PWA precache entry count: 195 vs. 54).
- **Typography is explicit, not inherited from PrimeVue.** PrimeVue's Aura preset has no font-family design token at all — it leaves typography entirely to the app, inheriting whatever `body` sets. The old (pre-v4) vendored theme CSS files happened to bundle "Inter var" and apply it broadly; deleting them during the v4 migration silently reset the *entire app* to the browser's serif default (Times New Roman) with nothing to catch it — confirmed via `getComputedStyle(document.body).fontFamily`. Fixed by self-hosting fonts via `@fontsource-variable/inter` (body copy — tabular figures matter for on-chain amounts) and `@fontsource-variable/space-grotesk` (headings, more distinct/crypto-native feel), imported in `main.ts` and applied via `--font-family-body`/`--font-family-heading` in `App.vue`'s global `<style>`. **If PrimeVue or its theme is ever swapped/upgraded again, re-check computed `font-family` on `body` before assuming typography survived the change** — it's an easy thing to lose silently since nothing errors, the page just quietly renders in a serif fallback.
- **`<Password :feedback="...">` convention**: this app deliberately disables PrimeVue's built-in password-strength overlay (`:feedback="false"`) on effectively every password field (it shows its own static strength-guidance copy instead). The overlay panel is tall enough to visually cover whatever sits directly below the field (e.g. a submit button one `.field.grid` row down) and, worse, **absorbs the first click there instead of closing** — so a real user's first click on an obscured button does nothing and they have to click twice. Two fields (`NewWallet.vue`'s create-wallet password, `Settings.vue`'s three change-password fields) were missing this and got fixed. If you add a new `<Password>` field, default to `:feedback="false"` unless you specifically want the meter *and* have verified nothing sits close below it.
- `AccountTopMenu.vue`'s account-scoped tab row (`TabMenu`) is styled as a segmented-pill bar (`.account-top-menu` scoped globals: bordered/shadowed `.p-tabmenu-tablist`, solid `var(--p-primary-color)` fill + `var(--p-primary-contrast-color)` text on `.p-tabmenu-item-active`), matching the elevated-card treatment used elsewhere, instead of Aura's bare default underline-tab style. Unlike `Menubar`, this component's custom `#item` template already correctly bound `v-bind="props.action/icon/label"` on both branches — TabMenu wasn't hit by the Menubar class-drift bug, it just needed deliberate visual treatment.
- **`.p-input-icon-left`/`.p-input-icon-right` are gone in v4** — another instance of the class-name-drift pattern above, this time on plain markup (`<span class="p-input-icon-left"><i class="pi pi-search"/><InputText/></span>`) rather than a custom component template, so it's easy to miss when auditing only `.vue` files that import renamed *components*. Symptom: the icon renders as a normal static-position sibling to the left of the input instead of absolutely-positioned inside it. Fixed app-wide (`Assets.vue`, `Transactions.vue`, `ScheduledPayments.vue`, `ScheduledPaymentDetail.vue`) by switching to the v4 replacement, `<IconField><InputIcon class="pi pi-search" /><InputText .../></IconField>` (both registered globally in `main.ts`). `Accounts.vue`'s search box was already on the modern `InputGroup`/`InputGroupAddon` pattern and was unaffected — when auditing for this, `grep -r "p-input-icon"` across `.vue` files directly rather than reasoning about it component-by-component.
- **Page background/contrast**: most page components render directly into `<slot />` in `layouts/Main.vue` (wallet-open branch) / `layouts/Public.vue` with no `Card`/`Panel` of their own (confirmed on `FAQ.vue`, `Privacy.vue`, `/multiaccount/*`, others). Once the animated gradient became a persistent fixed background (see `#gradient-canvas` above), those pages started rendering as bare text floating on the gradient, and secondary/muted text-color tokens (calibrated for a solid `--p-content-background`) became nearly illegible against it. Fixed with a shared `.page-shell` class (solid background, border, shadow, padding — defined in `App.vue`) applied to those two layout slot wrappers. **Deliberately not applied** to `Main.vue`'s wallet-closed (`Login`) branch, since `Login.vue`/`NewWallet.vue` already manage their own centered `Panel` layout and wrapping the whole viewport in a second outer card looked wrong there — those two components instead get a smaller `.link-strip` surface (same tokens, inline-flex, less padding) around just their flags-row/footer-links sections that sit outside the `Panel`.
  - **Don't give `.page-shell` its own horizontal margin.** `index.html`'s `#app` div already carries `m-2` (PrimeFlex, 0.5rem all sides) and both the navbar and every page's content live inside that same `#app`. `.page-shell` first shipped with `margin: 1rem` (all sides), which *added to* `#app`'s margin on top of it, so the shell sat inset further left/right than the navbar above it — visually "the navbar is wider than the page content". It's `margin: 1rem 0` (vertical rhythm between navbar/content/footer only) now. If horizontal spacing ever needs to change, change `#app`'s `m-2` in `index.html` so the navbar and `.page-shell` move together, not the shell alone.
- **Nested Cards under `.page-shell` are flattened, not doubled.** Several pages (`Accounts.vue`/`/` landing route, `AccountOverview.vue`) render a plain heading as a `.page-shell` sibling *and* wrap their main content in their own `<Card>` — since `.page-shell` is itself a card-like surface, this produced a visible "card inside a card" with mismatched left margins (the heading sat flush at the shell's padding edge; the `Card`'s content sat further indented by its own `.p-card-body` padding stacked on top of the shell's). Fixed with `.page-shell > .p-card { background: transparent; border: none; box-shadow: none; }` + `.page-shell > .p-card > .p-card-body { padding: 0 }` in `App.vue` — a `Card` that's a *direct* child of the shell dissolves into it (one visual surface, page-shell's padding is the only padding, headings/table/etc. all line up), while its `#header`/`#title`/`#content` slots keep their own internal `gap` spacing untouched. Only matches a direct-child `Card`, so intentionally nested/multi-card layouts deeper in a page aren't affected. If a page still looks "boxed twice" after this, check whether its `Card` is a *direct* slot child of `MainLayout`/`PublicLayout` or wrapped in an intermediate `<div>` (which would break the `>` selector) and either remove the wrapper or adjust the selector.

### Build config quirks

`vite.config.ts` polyfills Node built-ins (`buffer`, `crypto`, `stream`, `process`, etc.) for algosdk/crypto libraries that assume a Node environment — required for algosdk, WalletConnect, and Shamir-backup dependencies to work in-browser. PWA/service-worker generation is handled by `vite-plugin-pwa`. Path alias `@` → `src/`.

### `scripts/` (repo tooling, not app code)

Write new one-off/repo-tooling scripts in TypeScript, not plain `.js` — the source of truth is a `.ts` file compiled via `npm run build:scripts` (`tsc -p tsconfig.scripts.json`, which includes all of `scripts/*.ts`) into a same-named `.js`. There's no ts-node/tsx installed, so `node scripts/<name>.js` (the compiled output) is what actually runs — never hand-edit the `.js`, regenerate it after editing the `.ts`. The compiled `.js` for each `.ts`-sourced script is gitignored (listed explicitly in `.gitignore`, e.g. `scripts/check-locales.js`, `scripts/run-tests.js`) — only the `.ts` is committed, so wire the npm script to always rebuild first: `npm run build:scripts && node scripts/<name>.js` (see `check-locales`, `test`). `run-test-with-server.js` and `wait-for-server.js` predate this convention, have no `.ts` source, and stay committed as plain hand-written `.js` — leave them as-is unless asked to convert them (and if you do, add the new compiled `.js` to `.gitignore` too).

## Notes

- ESLint config is defined inline in `package.json` (`eslintConfig` key), not a standalone `.eslintrc` for the main app rules (though `.eslintrc.js` also exists).
- No backend/server-side code in this repo — it's a pure client-side SPA; "server" scripts (`npm run server`, `bs-config.js`) only serve the static `dist/` build for local testing.
- The only existing UI precedent for "ask the user for a BIP44 derivation index" is `src/pages/NewAccount/Ledger.vue`'s `slot` field (`InputNumber` with `showButtons`, `:min="0"`, `:max="2147483647"`). ARC-76 (`EmailPassword.vue`/`wallet.ts`'s `addEmailPasswordAccount`) has a `slot`/derivation-index *concept* baked into its ARC-0076 init string but no UI for it (hardcoded to `0`) — don't expect to find a UI pattern there.
- For actions that run both automatically (e.g. on page mount) and on explicit user request (e.g. a Refresh button), and that can legitimately fail on empty/not-yet-populated state (e.g. `wallet/syncAccountSigner`'s rekey check on a brand-new unfunded account), add a `silent?: boolean` param rather than special-casing the check itself — pass `true` from the mount path and let user-triggered call sites default to `false` so errors surface only when the user asked for the check.
