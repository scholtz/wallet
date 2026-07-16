# AWallet (Biatec Wallet) — Risk Registry

Living, cumulative record of security/code-audit risks identified for this
repository. Individual point-in-time reports live in `audits/reports/`; this file
is the current, deduplicated view across all of them. See
`audits/ai-audit-instructions.md` for the methodology used to produce and update
this registry — **do not hand-edit this file outside of running that audit
process**, so it stays a faithful summary of dated reports.

Never delete a row. When a risk is fixed, set Status to `Closed` and keep the row
(with the closing commit/report noted) for historical traceability.

## Registry provenance (update every audit)

| Field | Value |
|---|---|
| Last updated by audit report | `audits/reports/2026-07-16-6f2b077-fable-5.md` |
| Last updated (audited commit) | `6f2b07752a05851bb64b6eccc5eb658764c45bb0` |
| Last updated (commit date) | `2026-07-14` |
| Last updated (AWallet package version) | `2.0.0` |
| Last updated by | `claude-fable-5` |
| Instructions file version used | `ebe2059` |

## How to read this table

- **ID** — stable identifier, `AW-YYYY-NNN`, assigned in order of first discovery.
  Never reused, even if closed.
- **Severity** — per the scale in `ai-audit-instructions.md` §4 (Critical/High/Medium/Low/Informational).
- **5yr misuse probability** — the auditor's qualitative-to-quantitative estimate of
  the likelihood this risk is actually exploited/misused (by any attacker, against
  any user of this wallet) at some point within 5 years of the audit date, *if left
  unremediated*. Expressed as a band + rough % for comparability across audits:
  - **Very Low** (<2%) — theoretical, no known technique or realistic attacker motive.
  - **Low** (2-10%) — plausible but requires uncommon preconditions or high attacker effort.
  - **Medium** (10-35%) — realistic given current attacker tooling/incentives (e.g. known DApp-spoofing techniques, common misconfig).
  - **High** (35-70%) — actively exploited pattern elsewhere in the wallet ecosystem, or trivial to automate at scale.
  - **Very High** (>70%) — expect exploitation is highly likely absent a fix, e.g. a public, working exploit already exists for this exact pattern.
  This is re-assessed at every audit touching the risk — attacker techniques and the
  wallet's own exposure (user count, integrations) change over time, so probability
  is not fixed at time of discovery.
- **Status** — `Open` / `Mitigated` (reduces but doesn't eliminate) / `Closed` (fixed) / `Accepted` (risk acknowledged, deliberately not fixed — must include rationale).
- **First identified** — report + audited commit where first raised.
- **Last reviewed** — most recent report + commit that re-assessed this row.

## Risk register

| ID | Title | Severity | 5yr misuse probability | Status | Affected area | First identified | Last reviewed |
|---|---|---|---|---|---|---|---|
| AW-2026-001 | No warning/display for `closeRemainderTo`/`assetCloseTo` in any signing surface | Critical | High (~50%) | Closed | `store/wc.ts`, `pages/Sign.vue`, `pages/SignAll.vue`, `components/ConnectRequestsTable.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-002 | Weak KDF (single-round MD5 via CryptoJS passphrase overload) for wallet-at-rest encryption | High | Medium (~20%) | Closed | `store/wallet.ts`, `scripts/encoding/walletCrypto.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-003 | Full private key material logged to console on every account switch | High | Low (~8%) | Closed | `store/wallet.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-004 | Addresses truncated to 4+4 chars in signing UI; full value hover-only (no mobile access) | High | Medium (~15%) | Closed | `components/AlgorandAddress.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-005 | Self-originated payments trust configured node's genesis data with no cross-check | High | Low (~5%, post-mitigation) | Mitigated | `store/algod.ts`, `pages/Pay.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-006 | Unsanitized `href`/missing `rel=noopener` on WalletConnect v1 peer link | High | Low (~8%) | Closed | `pages/Connect.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-007 | `SignAll.vue` rekeyTo column bound to nonexistent field, always blank | Medium | Low (~5%) | Closed | `pages/SignAll.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-008 | WalletConnect `verifyContext` domain-verification signal received but never surfaced | Medium | Medium (~15%) | Closed | `store/wc.ts`, `pages/Connect.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-009 | Session approval defaults to granting all accounts across all networks | Medium | Medium (~15%) | Closed | `pages/Connect.vue`, `store/wc.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-010 | Custom algod/indexer endpoints fully user-editable, no validation/warning | Medium | Low (~8%) | Open | `store/config.ts`, `pages/Settings.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-011 | Auto-selected public node/indexer list fetched unauthenticated, unpinned (now also feeds the AW-2026-005 genesis cross-check) | Medium | Low (~8%, raised) | Open | `store/publicData.ts`, `store/config.ts`, `store/algod.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-012 | 5-min session timeout exists and auto-logs-out, but "Continue Session" needs no password re-entry (description corrected 2026-07-10 — prior wording overstated "no timeout") | Medium | Low (~10%) | Open | `components/Footer.vue`, `store/wallet.ts` (`prolong`/`logout`) | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-013 | Reverse tabnabbing: WC v2 peer links lack `rel="noopener noreferrer"` | Medium | Low (~5%) | Closed | `pages/Connect.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-014 | Rekey warning styling inconsistent; WC batch table lacks visual emphasis | Low | Low (~5%) | Closed | `components/ConnectRequestsTable.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-015 | No Content-Security-Policy anywhere in the deployment stack | Low–Medium | Low (~8%) | Open | `index.html`, K8s ingress, no vercel.json | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-016 | `approveSession` grants all networks regardless of DApp's requested namespaces | Low | Very Low (<2%) | Open | `store/wc.ts`, `store/wcClient.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-017 | WC v1 path hardcodes mainnet chainId 4160 regardless of active network | Low | Very Low (<2%) | Open | `shared/wc.ts:236` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-018 | Genesis hash/ID shown in WC detail view but not actively cross-validated | Low | Very Low (<2%) | Closed | `components/ConnectRequestsTable.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-019 | Unbounded recursion in `getSK` on multi-hop rekey cycle (DoS) | Low | Very Low (<2%) | Closed | `store/wallet.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-020 | Dev-mode raw `sk` JSON dump on Export page, ambiguously labeled | Low | Very Low (<2%) | Closed | `pages/Account/Export.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-021 | ARC-14 auth token lacks explicit endpoint/audience/timestamp binding | Medium | Needs verification | Open | `store/arc14.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-022 | Production deploy workflow has no build/test gate of its own | Medium | Low (~5%) | Open | `.github/workflows/awallet-main.yml` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-023 | Unused, name-confusable dependency `cryptojs@2.5.3` | Low | Very Low (<2%) | Closed | `package.json` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) |
| AW-2026-024 | Legacy WalletConnect v1 client still a direct dependency (now confirmed source of 2 high + 1 moderate `pnpm audit` advisories) | Low | Low (~5%, raised) | Open | `package.json`, `shared/wc.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-025 | `changePassword` silently reverts: old password remains in session state and re-encrypts wallet on next auto-save | High | Medium (~25%, triggered by normal use, no attacker needed) | Closed | `store/wallet.ts` (`changePassword`/`saveWallet`/`setIsOpen`), `pages/Settings.vue` | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | `2026-07-10-4483920-sonnet-5.md` @ `4483920` (2026-07-10) — fix commit `770dc8d`, re-verified |
| AW-2026-026 | In-memory session password wrapped with legacy CryptoJS keyed from localStorage (obfuscation only); dead `rs2` key | Low | Very Low (<2%) | Open | `store/wallet.ts`, localStorage `rs1`/`rs2` | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-027 | PBKDF2 derived-key cache never cleared on logout (decryption capability outlives session) | Low | Very Low (<2%) | Closed | `scripts/encoding/walletCrypto.ts`, `store/wallet.ts` (`logout`, `destroyWallet`) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | `2026-07-10-4483920-sonnet-5.md` @ `4483920` (2026-07-10) — fix commit `770dc8d`, re-verified |
| AW-2026-028 | Known CVEs in transitive deps (mostly via WC v1 chain) + unused `page` package with high ReDoS advisory | Low | Low (~3%) | Open | `package.json`, `pnpm-lock.yaml` | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) |
| AW-2026-035 | `pnpm run build` fails at HEAD: `typescript@7.0.2` bump breaks `vue-tsc` (`exports` map) and bare `tsc` (removed `moduleResolution`/`baseUrl`) | High | Low (~5%, availability not exploit risk) | Closed | `package.json`, `tsconfig.json`, `docker/Dockerfile` | `2026-07-10-4483920-sonnet-5.md` @ `4483920` (2026-07-10) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) — fix commit `57a1002`, build re-run clean |
| AW-2026-036 | New `/changelog` page renders `CHANGELOG.md` via unescaped markdown-to-HTML into `v-html` (latent stored XSS if the file ever contains `<`/`>`/`&`); sibling `v-html` sink added in `Footer.vue` is currently inert but shares the pattern | Medium | Low (~8%) | Closed | `pages/Changelog.vue`, `components/Footer.vue` | `2026-07-10-4483920-sonnet-5.md` @ `4483920` (2026-07-10) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) — fix commit `57a1002`, re-verified in source |
| AW-2026-037 | Redesigned `/faq` renders locale-file answer strings (with intentional embedded `<a>` HTML) through `v-html` — all 10 `src/locales/*.json` files join the XSS trust boundary; translation PRs are a realistic low-scrutiny vector; no live payload today (all anchors hardcoded trusted domains + `noopener noreferrer`) | Medium | Low (~5%) | Closed | `pages/FAQ.vue`, `src/locales/*.json` (`faq.categories.*.a*`) | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) | fix applied 2026-07-16 (uncommitted, on top of `6f2b077`) |
| AW-2026-038 | WalletConnect client no longer auto-initializes (commit `9471074` removed `App.vue` bootstrap): approved-session sign requests silently unreceived until user clicks "Init WC" on `/account/connect`; regression of documented intent, possibly accidental | Low | Very Low (<2%, functional regression not exploit path) | Closed | `App.vue` (removal), `pages/Connect.vue:521-523` | `2026-07-16-6f2b077-fable-5.md` @ `6f2b077` (2026-07-16) | fix applied 2026-07-16 (uncommitted, on top of `6f2b077`) |
| AW-2026-029 | Password sharing / weak or reused user passwords | Critical (impact) | Medium (~20%) | Accepted | User behavior — no code surface; `store/wallet.ts` KDF is the only mitigating lever | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | same |
| AW-2026-030 | Shared/unattended device or stolen device with an unlocked or persistently-decrypted session | High (impact) | Medium (~15%) | Accepted | User behavior + `store/wallet.ts` (no auto-lock, see AW-2026-012 for the one in-scope lever) | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | same |
| AW-2026-031 | Phishing of the wallet's own UI (fake AWallet site/app, fake update, fake support) | Critical (impact) | High (~40%) | Accepted | Outside the app itself — domain/app-store/distribution integrity, user vigilance | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | same |
| AW-2026-032 | Social engineering to get the user to voluntarily export/paste their mnemonic, sk, or password (fake support, fake dApp, fake "verify your wallet") | Critical (impact) | High (~40%) | Accepted | User behavior — `pages/Account/Export.vue` UI copy is the only in-scope lever | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | same |
| AW-2026-033 | Compromise of the user's own device (malware, keylogger, malicious browser extension, OS-level compromise) | Critical (impact) | Medium (~25%) | Accepted | Outside the app — OS/browser trust boundary; app cannot defend against a compromised execution environment | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | same |
| AW-2026-034 | User loses/forgets their password or mnemonic backup with no recovery mechanism (by design, non-custodial) | High (impact) | Medium (~20%) | Accepted | Inherent to non-custodial design — not a vulnerability, a property of the trust model | `2026-07-09-ebe2059-fable-5.md` @ `ebe2059` (2026-07-09) | same |

<!--
Row template to copy when adding a new risk:

| AW-YYYY-NNN | <short title> | <Critical/High/Medium/Low/Informational> | <Very Low/Low/Medium/High/Very High (~X%)> | <Open/Mitigated/Closed/Accepted> | <file/module> | `<report>` @ `<commit short>` (YYYY-MM-DD) | `<report>` @ `<commit short>` (YYYY-MM-DD) |

Each row should link (below the table, or in the linked report) to:
- A one-paragraph rationale for the probability estimate, not just the label.
- The specific finding ID's full writeup in its originating audits/reports/*.md file.
-->

## Accepted risks outside the wallet's control (AW-2026-029 .. -034)

AWallet is a non-custodial client with no backend (see `ai-audit-instructions.md`
§1); by design there is no code-level control over what happens on the user's own
device, in the user's own head, or on domains/channels AWallet doesn't operate.
The audit process (§0 item 4 / §2 item 6) still requires these to be recorded
rather than silently excluded, since they are the dominant *real-world* cause of
wallet fund loss industry-wide — a professional audit that only lists in-scope
code bugs and says nothing about them would understate the actual risk picture a
stakeholder needs to see. They are logged with Status `Accepted`: acknowledged,
not fixable by a code change, tracked so the app's *UI-level* mitigations (warning
copy, confirmation friction, education) can be evaluated against them over time.

- **AW-2026-029 (password sharing / weak or reused passwords):** the wallet
  cannot prevent a user from choosing a weak password or disclosing it. In-scope
  lever: the KDF strength (AW-2026-002, fixed) sets the floor for how much a weak
  password actually protects; consider a password-strength meter/minimum on
  wallet creation as a further UI-level mitigation.
- **AW-2026-030 (shared/unattended/stolen device):** no code control over
  physical device custody. In-scope lever: AW-2026-012 (no auto-lock) is the one
  concrete, still-open code-level mitigation that reduces this risk's window.
- **AW-2026-031 (phishing of the wallet's own identity — fake site, fake app,
  fake update):** outside the running application's own code; depends on domain/
  app-store/build-distribution integrity (outside this repo) and user vigilance.
  Note for future audits: this is *distinct* from AW-2026-008 (in-scope — a
  malicious *DApp* impersonating a trusted DApp *to* AWallet), which is a code
  surface AWallet does control and has already mitigated.
- **AW-2026-032 (social engineering to voluntarily export secrets):** e.g. fake
  support asking a user to paste their mnemonic, a fake "wallet verification"
  flow. In-scope lever: `Export.vue`'s password-gate and its labeling
  (AW-2026-020, fixed) are the app's only real friction point here; the wallet
  cannot distinguish a legitimate self-export from a coerced one.
- **AW-2026-033 (device/OS/browser compromise — malware, keylogger, malicious
  extension):** a compromised execution environment can read anything the page
  can read, including decrypted key material while the wallet is unlocked
  (compounds with AW-2026-012/-026/-027). No in-browser JS application can fully
  defend against this; it's the trust boundary the whole client-side model sits
  on top of.
- **AW-2026-034 (lost password / lost mnemonic backup, no recovery):** this is
  not a bug — it is the direct, intended consequence of "non-custodial, no
  backend, all key material stays local" (`ai-audit-instructions.md` §1). Logged
  here because it is a real, common cause of permanent fund loss for this class
  of wallet and belongs in a complete risk picture, not because it should change.

## Closed / historical risks

_(Closed rows stay in the table above with Status = Closed; this section is for any
narrative context on closures — e.g. "fixed by commit `abc1234`, verified in audit
`audits/reports/YYYY-MM-DD-....md`" — that doesn't fit in the table.)_

**2026-07-16 — fix pass following `audits/reports/2026-07-16-6f2b077-fable-5.md`**
(applied on top of `6f2b077`, uncommitted at time of this registry update; to be
independently re-verified by the next audit run):

- **AW-2026-037 (Closed):** removed the `v-html` sink in `src/pages/FAQ.vue`
  entirely, rather than escaping it (escaping wasn't viable here since the
  answers deliberately embed real links). The 10 FAQ answer keys that
  contained `<a href="...">label</a>` markup (`general.a5`, `biatec.a1`-`a5`,
  `actions.a4`, `swap.a1`, `backup.a4`, `backup.a5` — 13 anchors total) were
  migrated across all 10 `src/locales/*.json` files: the answer string now
  contains only plain `{link1}`/`{link2}` placeholder tokens, and the
  translated visible label moved to a new sibling key
  (`<answerKey>_link1`/`_link2`). `FAQ.vue` renders each answer via
  vue-i18n's `<i18n-t :keypath="item.a">` component with `#name`/`#link1`/
  `#link2` named slots; the slot content is a real `<a>` element with a
  hardcoded URL (never translated, never attacker-influenceable) and
  `target="_blank" rel="noopener noreferrer"`, so translated locale content
  is interpolated as vue-i18n message parameters, never parsed as an HTML
  string. `scripts/check-locales.ts` gained a second check
  (`collectHtmlLikeValues`/`HTML_TAG_PATTERN`) that fails the build if any
  locale value (in any of the 10 files) matches an HTML-tag shape, so a
  future translation PR or feature can't silently reopen this or a similar
  sink. Verified: `pnpm run build` (vue-tsc + vite) and `pnpm run
  check-locales` both pass; a headless Playwright check against the running
  dev server confirmed all 13 links render as real anchors with correct
  href/label pairs and `rel="noopener noreferrer"`, search-by-link-text still
  works, and — the key regression test — injecting a
  `<img src=x onerror="...">` payload into a locale value and reloading the
  page rendered it as inert escaped text (`&lt;img ... &gt;`) with zero
  script execution and zero console errors, then the test file was restored.
- **AW-2026-038 (Closed):** restored `App.vue`'s `initWc()` bootstrap
  (`mounted()` call + `walletIsOpen` watcher dispatching `wc/init`, guarded
  by `if (state.wc.web3wallet) return`) that commit `9471074` had removed.
  This is a straight revert to the previously-working, CHANGELOG-documented
  behavior ("WalletConnect now connects as soon as the wallet is opened");
  `CLAUDE.md` gained a note marking this bootstrap load-bearing so a future
  refactor doesn't drop it silently again. Verified via `pnpm run build`
  (no type errors) and by confirming the dev server produces no console
  errors on load with the restored watcher/mounted-hook wiring.
- `CHANGELOG.md` and `CLAUDE.md` updated to document both fixes for future
  readers/audits.

**2026-07-16 — audit `audits/reports/2026-07-16-6f2b077-fable-5.md` @ `6f2b077`
(independent re-verification of the `57a1002` fix pass, plus review of the
auth/FAQ/mobile redesign and WC-summary fix landed since `4483920`):**

- **AW-2026-035 / AW-2026-036 (Closed, confirmed):** the fix pass the previous
  registry update described as "uncommitted" is now committed as `57a1002`.
  AW-2026-035 re-verified end-to-end: `typescript` pinned back to `^6.0.3` and
  the full `pnpm run build` (vue-tsc + vite + PWA) re-run clean at `6f2b077`.
  AW-2026-036 re-verified in source: `Changelog.vue` escapes every line before
  tag construction; `Footer.vue` escapes all interpolated values in
  `brandLineHtml`.
- New findings: **AW-2026-037** (Medium — the redesigned `/faq` renders locale
  answer strings containing intentional `<a>` HTML via `v-html`, adding all 10
  locale files to the XSS trust boundary; no live payload today) and
  **AW-2026-038** (Low — commit `9471074` removed the `App.vue` WalletConnect
  bootstrap, so approved-session sign requests are silently not received until
  the user manually clicks "Init WC" on `/account/connect`; functional
  regression of documented intent, not an exploit path). Full writeups in the
  new report.
- Positive changes verified (no finding ID): commit `cac4537` fixed the
  WalletConnect request summary to read asset/amount from
  `decoded.assetTransfer`/`decoded.payment` (previously blank on every real
  transaction) and added asset/amount rows to the per-transaction detail
  expansion; commit `6f2b077` renders transaction-table sender/receiver through
  the tap-to-reveal `AlgorandAddress` component (extends the AW-2026-004 fix).
- All other Open/Mitigated rows re-verified, none regressed, none newly
  resolved (backing files unchanged since `4483920`). `pnpm run check-locales`
  passes (including ~170 new `faq.*` keys); `pnpm audit --prod` advisory set
  identical to the prior audit (AW-2026-024/-028 unchanged).

**2026-07-10 — fix pass following `audits/reports/2026-07-10-4483920-sonnet-5.md`**
(applied on top of `4483920`, uncommitted at time of this registry update; to be
independently re-verified by the next audit run):

- **AW-2026-035 (Closed):** `package.json`'s `typescript` devDependency pinned
  back to `^6.0.3` (the version `vue-tsc@3.3.7` and the current `tsconfig.json`
  were built against), lockfile updated via `pnpm install`. Re-ran `pnpm run
  build` (`vue-tsc --noEmit && vite build`), `pnpm run
  check-typescript-errors-vue`, and `pnpm run lint` end-to-end — all pass
  cleanly at this fix.
- **AW-2026-036 (Closed):** added an `escapeHtml()` step (escaping `&`, `<`,
  `>`) in `src/pages/Changelog.vue`'s `renderInline()`, applied to every line
  of `CHANGELOG.md` before any HTML tag is added, so raw angle brackets in the
  source markdown can no longer be interpreted as markup by the `v-html` sink.
  `src/components/Footer.vue`'s `brandLineHtml` computed property now escapes
  the two non-hardcoded interpolated values (`name`, `envStatus`) the same
  way, closing the pattern before a future change could thread a
  less-trusted value through it.
- Not addressed in this pass: **AW-2026-012**'s recommendation (require
  password re-entry on "Continue Session" / the header keepalive button) was
  left open — it's a UX/security tradeoff (how often a user should have to
  re-enter their password during active use) that warrants a product decision
  rather than a mechanical fix, and touches the always-visible header prolong
  button in addition to the warning dialog. Remains Open for a future audit or
  explicit follow-up.

**2026-07-10 — audit `audits/reports/2026-07-10-4483920-sonnet-5.md` @ `4483920`
(independent re-verification of the `770dc8d` fix pass, plus review of the
branding/changelog/dependency changes landed since `ebe2059`):**

- **AW-2026-025 / AW-2026-027 (Closed, confirmed):** the fix pass described
  below (previously "uncommitted") is now committed as `770dc8d`. Both fixes
  re-verified directly in source at `4483920`: `changePassword` commits the new
  password via `setIsOpen`; `logout`/`destroyWallet` both call
  `clearDerivedKeys()`.
- **AW-2026-012 (description corrected, remains Open):** re-traced
  `components/Footer.vue`'s session timer end-to-end. The prior wording ("no
  auto-lock/session timeout; keys persist indefinitely") does not match current
  code — a working 5-minute timeout exists and does clear `privateAccounts` on
  expiry. Corrected description: the timeout exists, but its renewal path
  (`wallet/prolong`, triggered by the "Continue Session" button) requires no
  password re-entry, so brief physical access during the 30-second warning
  window is enough to keep a session alive indefinitely. See the new report for
  the full trace.
- New findings from this audit: **AW-2026-035** (High — `pnpm run build` broken
  at HEAD by the `typescript@7.0.2` bump; build/CI availability issue, not an
  exploit path) and **AW-2026-036** (Medium — new `/changelog` page pipes
  unescaped `CHANGELOG.md` markdown into `v-html`; latent stored-XSS sink, no
  live payload today). Full writeups in the new report.
- No prior "Open"/"Mitigated" row regressed. `pnpm run check-locales` and
  `pnpm audit --prod` re-run; locale parity holds, dependency advisory set
  unchanged from AW-2026-024/-028's prior characterization.

**2026-07-09 — fix pass following `audits/reports/2026-07-09-ebe2059-fable-5.md`**
(applied on top of `ebe2059` as commit `770dc8d`, independently re-verified by
`audits/reports/2026-07-10-4483920-sonnet-5.md` @ `4483920`):

- **AW-2026-025 (Closed):** `changePassword` (`store/wallet.ts`) now commits
  `setIsOpen({ name, pass: passw2 })` after successfully re-encrypting the wallet
  record, so `state.pass` (and therefore every subsequent `saveWallet`) uses the
  *new* password instead of the old one it had been left holding from the
  `openWallet` verification step. `Settings.vue`'s `changePasswordClick` now
  `await`s the dispatch and only shows the success toast when it actually
  returns `true`.
- **AW-2026-027 (Closed):** added `clearDerivedKeys()` to
  `scripts/encoding/walletCrypto.ts`, dispatched from both the `logout` and
  `destroyWallet` actions in `store/wallet.ts`, so cached non-extractable AES
  keys don't outlive the session.

**2026-07-09 — audit `audits/reports/2026-07-09-ebe2059-fable-5.md` @ `ebe2059`
(independent verification of the remediation pass in commit `ebe2059`):**

All closures claimed by the 2026-07-09 remediation pass were independently
re-verified in source and confirmed. Closed at this audit: AW-2026-001, -002,
-003, -004, -006, -007, -008, -009, -013, -014, -018, -019, -020, -023.
Mitigated (confirmed): AW-2026-005 — genesis id + CAIP-10 hash cross-check in
`store/algod.ts` covers all three transaction-building paths, but node-supplied
balance/asset data is still trusted and the CAIP-10 reference list is itself the
unpinned external source flagged by AW-2026-011 (whose value as a target this
mitigation increases — noted on that row).

New at this audit: AW-2026-025 (High — `changePassword` silently reverted by the
next auto-save; fix by updating `state.pass` to the new password before
returning, and awaiting the action in `Settings.vue`), AW-2026-026, AW-2026-027,
AW-2026-028 (Low — see the report for full writeups).

Note: this registry's header/first line was corrupted by the previous update (a
stray row of status cells prepended before the title); repaired as part of this
audit's registry update with no row data lost.

**2026-07-09 — remediation pass following `audits/reports/2026-07-09-4f915d4.md`**
(statuses updated as part of the fix work; independently re-verified by
`2026-07-09-ebe2059-fable-5.md`, see above):

- **AW-2026-001 (Closed):** `closeRemainderTo`/`assetCloseTo` is now extracted and
  rendered as a red `Message severity="error"` warning (with explanatory copy,
  localized in all 10 locales) in `Sign.vue` (single + multisig views),
  `SignAll.vue` (column + expanded row), and `ConnectRequestsTable.vue`
  (column + expanded row); `store/wc.ts` also surfaces a `closeTo` field on its
  transaction summaries.
- **AW-2026-002 (Closed):** wallet-at-rest encryption now uses PBKDF2-SHA256
  (600,000 iterations, Web Crypto) + AES-256-GCM via
  `src/scripts/encoding/walletCrypto.ts` (format `AWEv1.<iter>.<salt>.<iv>.<ct>`).
  Legacy CryptoJS blobs still decrypt for backward compatibility and are
  transparently re-encrypted to the new format on wallet open and on every save.
- **AW-2026-003 (Closed):** the `privateAccounts` console dump was removed, along
  with every other `console.log` in `src/` (repo-wide grep now returns zero).
- **AW-2026-004 (Closed):** `AlgorandAddress.vue` now reveals the full
  untruncated address on tap/click (keyboard-accessible), plus a native `title`
  attribute for hover — usable on mobile.
- **AW-2026-005 (Mitigated):** `store/algod.ts` now cross-checks the node's
  suggested-params `genesisID` against the selected network, and the
  `genesisHash` against the known CAIP-10 prefix from the genesis list, before
  building payment/asset-create transactions. Balance/asset data from the node
  is still trusted (hence Mitigated, not Closed).
- **AW-2026-006 / AW-2026-013 (Closed):** WC1 peer link routed through
  `normalizeUrl()` and all WC peer/proposer links carry
  `rel="noopener noreferrer"`.
- **AW-2026-007 / AW-2026-014 (Closed):** `SignAll.vue`'s rekey-to column now
  actually renders `txn.rekeyTo` with the red error treatment; the WC batch
  table uses the same emphasis.
- **AW-2026-008 (Closed):** WalletConnect `verifyContext` is surfaced in the
  session-proposal table (verified / mismatch / unknown / known-scam badge).
- **AW-2026-009 (Closed):** session approval defaults to the active account only
  (`allAccounts` now defaults to `false`).
- **AW-2026-018 (Closed):** WC transaction detail view shows a mismatch warning
  when the transaction's `genesisID` differs from the active network.
- **AW-2026-019 (Closed):** `getSK` rewritten iteratively with a visited-set
  cycle guard.
- **AW-2026-020 (Closed):** the Export page dev-info JSON now redacts `sk` and
  `hdMnemonic`.
- **AW-2026-023 (Closed):** unused `cryptojs@2.5.3` dependency removed.

Still open after the `ebe2059` audit and the follow-up fix pass above:
AW-2026-010, -011, -012, -015, -016, -017, -021, -022, -024, -026, -028 (Medium/
Low, code-fixable). AW-2026-025 and -027 (High/Low) were fixed in the follow-up
pass. AW-2026-029 through -034 are `Accepted` — outside the wallet's code-level
control by nature (see "Accepted risks outside the wallet's control" above).
