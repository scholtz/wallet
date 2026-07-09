| Mitigated || Closed || Closed || Closed || Closed || Closed || Closed || Closed || Closed || Closed || Closed || Closed || Closed || Closed || Closed |# AWallet (Biatec Wallet) — Risk Registry

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
| Last updated by audit report | `audits/reports/2026-07-09-4f915d4.md` |
| Last updated (audited commit) | `4f915d4057d72f766ebcedae558f56ccf87f157a` |
| Last updated (commit date) | `2026-07-09` |
| Last updated (AWallet package version) | `2.0.0` |
| Last updated by | `claude-sonnet-5` |
| Instructions file version used | `99dfdc1` |

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
| AW-2026-001 | No warning/display for `closeRemainderTo`/`assetCloseTo` in any signing surface | Critical | High (~50%) | Open | `store/wc.ts`, `pages/Sign.vue`, `pages/SignAll.vue`, `components/ConnectRequestsTable.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-002 | Weak KDF (single-round MD5 via CryptoJS passphrase overload) for wallet-at-rest encryption | High | Medium (~20%) | Open | `store/wallet.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-003 | Full private key material logged to console on every account switch | High | Low (~8%) | Open | `store/wallet.ts:311` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-004 | Addresses truncated to 4+4 chars in signing UI; full value hover-only (no mobile access) | High | Medium (~15%) | Open | `components/AlgorandAddress.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-005 | Self-originated payments trust configured node's genesis data with no cross-check | High | Low (~10%) | Open | `store/algod.ts`, `pages/Pay.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-006 | Unsanitized `href`/missing `rel=noopener` on WalletConnect v1 peer link | High | Low (~8%) | Open | `pages/Connect.vue:93-100` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-007 | `SignAll.vue` rekeyTo column bound to nonexistent field, always blank | Medium | Low (~5%) | Open | `pages/SignAll.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-008 | WalletConnect `verifyContext` domain-verification signal received but never surfaced | Medium | Medium (~15%) | Open | `store/wc.ts`, `pages/Connect.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-009 | Session approval defaults to granting all accounts across all networks | Medium | Medium (~15%) | Open | `pages/Connect.vue`, `store/wc.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-010 | Custom algod/indexer endpoints fully user-editable, no validation/warning | Medium | Low (~8%) | Open | `store/config.ts`, `pages/Settings.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-011 | Auto-selected public node/indexer list fetched unauthenticated, unpinned | Medium | Low (~5%) | Open | `store/publicData.ts`, `store/config.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-012 | No auto-lock/session timeout; keys persist indefinitely in memory | Medium | Low (~10%) | Open | `store/wallet.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-013 | Reverse tabnabbing: WC v2 peer links lack `rel="noopener noreferrer"` | Medium | Low (~5%) | Open | `pages/Connect.vue:175-180,301-305` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-014 | Rekey warning styling inconsistent; WC batch table lacks visual emphasis | Low | Low (~5%) | Open | `components/ConnectRequestsTable.vue` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-015 | No Content-Security-Policy anywhere in the deployment stack | Low–Medium | Low (~8%) | Open | `index.html`, K8s ingress, no vercel.json | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-016 | `approveSession` grants all networks regardless of DApp's requested namespaces | Low | Very Low (<2%) | Open | `store/wc.ts`, `store/wcClient.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-017 | WC v1 path hardcodes mainnet chainId 4160 regardless of active network | Low | Very Low (<2%) | Open | `shared/wc.ts:234-237` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-018 | Genesis hash/ID shown in WC detail view but not actively cross-validated | Low | Very Low (<2%) | Open | `components/ConnectRequestsTable.vue:328-337` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-019 | Unbounded recursion in `getSK` on multi-hop rekey cycle (DoS) | Low | Very Low (<2%) | Open | `store/wallet.ts:730-752` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-020 | Dev-mode raw `sk` JSON dump on Export page, ambiguously labeled | Low | Very Low (<2%) | Open | `pages/Account/Export.vue:416-419` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-021 | ARC-14 auth token lacks explicit endpoint/audience/timestamp binding | Medium | Needs verification | Open | `store/arc14.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-022 | Production deploy workflow has no build/test gate of its own | Medium | Low (~5%) | Open | `.github/workflows/awallet-main.yml` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-023 | Unused, name-confusable dependency `cryptojs@2.5.3` | Low | Very Low (<2%) | Open | `package.json` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |
| AW-2026-024 | Legacy WalletConnect v1 client still a direct dependency | Low | Needs verification | Open | `package.json`, `shared/wc.ts` | `2026-07-09-4f915d4.md` @ `4f915d4` (2026-07-09) | same |

<!--
Row template to copy when adding a new risk:

| AW-YYYY-NNN | <short title> | <Critical/High/Medium/Low/Informational> | <Very Low/Low/Medium/High/Very High (~X%)> | <Open/Mitigated/Closed/Accepted> | <file/module> | `<report>` @ `<commit short>` (YYYY-MM-DD) | `<report>` @ `<commit short>` (YYYY-MM-DD) |

Each row should link (below the table, or in the linked report) to:
- A one-paragraph rationale for the probability estimate, not just the label.
- The specific finding ID's full writeup in its originating audits/reports/*.md file.
-->

## Closed / historical risks

_(Closed rows stay in the table above with Status = Closed; this section is for any
narrative context on closures — e.g. "fixed by commit `abc1234`, verified in audit
`audits/reports/YYYY-MM-DD-....md`" — that doesn't fit in the table.)_

**2026-07-09 — remediation pass following `audits/reports/2026-07-09-4f915d4.md`**
(statuses updated as part of the fix work; to be independently re-verified by the
next audit run):

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

Still open after this pass: AW-2026-010, -011, -012, -015, -016, -017, -021,
-022, -024.
