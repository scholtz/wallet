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

### Build config quirks

`vite.config.ts` polyfills Node built-ins (`buffer`, `crypto`, `stream`, `process`, etc.) for algosdk/crypto libraries that assume a Node environment — required for algosdk, WalletConnect, and Shamir-backup dependencies to work in-browser. PWA/service-worker generation is handled by `vite-plugin-pwa`. Path alias `@` → `src/`.

### `scripts/` (repo tooling, not app code)

Write new one-off/repo-tooling scripts in TypeScript, not plain `.js` — the source of truth is a `.ts` file compiled via `npm run build:scripts` (`tsc -p tsconfig.scripts.json`, which includes all of `scripts/*.ts`) into a same-named `.js`. There's no ts-node/tsx installed, so `node scripts/<name>.js` (the compiled output) is what actually runs — never hand-edit the `.js`, regenerate it after editing the `.ts`. The compiled `.js` for each `.ts`-sourced script is gitignored (listed explicitly in `.gitignore`, e.g. `scripts/check-locales.js`, `scripts/run-tests.js`) — only the `.ts` is committed, so wire the npm script to always rebuild first: `npm run build:scripts && node scripts/<name>.js` (see `check-locales`, `test`). `run-test-with-server.js` and `wait-for-server.js` predate this convention, have no `.ts` source, and stay committed as plain hand-written `.js` — leave them as-is unless asked to convert them (and if you do, add the new compiled `.js` to `.gitignore` too).

## Notes

- ESLint config is defined inline in `package.json` (`eslintConfig` key), not a standalone `.eslintrc` for the main app rules (though `.eslintrc.js` also exists).
- No backend/server-side code in this repo — it's a pure client-side SPA; "server" scripts (`npm run server`, `bs-config.js`) only serve the static `dist/` build for local testing.
- The only existing UI precedent for "ask the user for a BIP44 derivation index" is `src/pages/NewAccount/Ledger.vue`'s `slot` field (`InputNumber` with `showButtons`, `:min="0"`, `:max="2147483647"`). ARC-76 (`EmailPassword.vue`/`wallet.ts`'s `addEmailPasswordAccount`) has a `slot`/derivation-index *concept* baked into its ARC-0076 init string but no UI for it (hardcoded to `0`) — don't expect to find a UI pattern there.
- For actions that run both automatically (e.g. on page mount) and on explicit user request (e.g. a Refresh button), and that can legitimately fail on empty/not-yet-populated state (e.g. `wallet/syncAccountSigner`'s rekey check on a brand-new unfunded account), add a `silent?: boolean` param rather than special-casing the check itself — pass `true` from the mount path and let user-triggered call sites default to `false` so errors surface only when the user asked for the check.
