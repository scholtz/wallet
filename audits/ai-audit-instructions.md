# AWallet (Biatec Wallet) — AI Audit Instructions

This file is the standing brief for any AI model asked to perform a security/code
audit of this repository. It exists so that typing **"do new audit"** (optionally
with a specific instruction file, e.g. "do new audit with audits/ai-audit-instructions.md")
is enough to reproduce a consistent, professional, extensive audit report every time —
no re-explaining scope, methodology, or output format.

The AI model performing the audit must act as a **professional smart-contract /
wallet-security auditing company** would: skeptical, adversarial, evidence-based,
and precise about severity. Do not pad the report with generic advice; every finding
must reference actual file paths and line numbers in this repository at the commit
being audited.

## 0. Before you start

1. Record the audit metadata (see "Report header" below) — commit hash, date, model,
   operator — **before** you begin reading code, so it reflects the exact state audited.
2. Confirm the working tree is clean (`git status`) and note the commit hash
   (`git rev-parse HEAD`). If the tree is dirty, note that explicitly in the report —
   audits should normally run against a committed, reproducible state.
3. Read `CLAUDE.md` at the repo root first. It documents architecture, trust model,
   and known non-obvious gotchas (HD wallet derivation, encryption-at-rest, WalletConnect
   flows, etc.) — an audit that contradicts documented behavior without addressing it
   is not credible.
4. Check `audits/risk-registry.md` for previously identified risks. A new audit must:
   - Re-verify whether previously open risks are now fixed, still open, or regressed.
   - Not silently drop a prior finding — carry it forward with an updated status.

## 1. Scope

AWallet is a **client-side, non-custodial Algorand wallet**. There is no backend;
all key material is generated, encrypted, and stored locally (Dexie/IndexedDB), and
signing happens in-browser. The audit's central question is always:

> **Under what conditions could a user's funds, keys, or transaction intent be
> stolen, corrupted, or misrepresented — by an attacker, a malicious dependency,
> or the wallet's own logic?**

In scope, in priority order:

1. **Key material handling** — generation, derivation (ed25519, ARC-76, HD/BIP32-Ed25519,
   multisig, Ledger, rekeyed accounts), encryption at rest, decryption, in-memory
   lifetime, export/backup flows (`src/store/wallet.ts`, `src/store/signer.ts`,
   `src/scripts/encoding/`).
2. **Signing logic** — that the bytes actually signed match the bytes actually shown
   to / intended by the user (transaction construction, `bytesToSign()` vs `toByte()`
   correctness, multisig/Shamir threshold logic, ARC-14 signed-request auth).
3. **WalletConnect / DApp-facing surface** (`src/store/wc.ts`, `src/store/wcClient.ts`) —
   this is the largest external-input attack surface: a malicious or compromised DApp
   sends session requests and transaction payloads. Check request validation, session
   approval UX (can a user be tricked into approving something other than what they
   see?), origin/metadata spoofing, and replay.
4. **Chain data trust** — `src/store/algod.ts`, `src/store/indexer.ts`, `src/store/axios.ts`,
   `arc14.ts`: is data from node/indexer/external HTTP endpoints treated as untrusted
   input? Are configured endpoints user-editable in a way that could redirect signing
   context to a malicious node?
5. **Dependency supply chain** — `pnpm-lock.yaml`, direct deps in `package.json` with
   special attention to crypto libraries (`algosdk`, `@algorandfoundation/xhd-wallet-api`,
   `libsodium-wrappers-sumo`, `@walletconnect/*`) and any postinstall scripts.
6. **Client-side storage** — Dexie/IndexedDB schema, what is encrypted vs. plaintext,
   password/KDF strength, session/unlock timeout behavior, clipboard/export exposure
   (mnemonic display, QR export, "copy to clipboard" for secrets).
7. **Build & deployment integrity** — Vite config (Node polyfills, aliasing), CI/CD
   (GitHub Actions), PWA/service-worker caching (`vite-plugin-pwa`) — could a cached
   asset serve stale/malicious code, or could CI be a supply-chain vector?
8. **Web application hygiene** — XSS, CSP, dependency-confusion, `postMessage` handling
   (WalletConnect relies on this), open redirects in router, any use of `eval`/`innerHTML`.
9. **UI/UX trust cues** — does the UI accurately represent what will be signed (amount,
   asset, recipient, fee, rekey warnings)? Misleading UI in a signing flow is a real
   vulnerability class for wallets even with cryptographically correct signing.

Out of scope (note as such rather than ignoring silently): Algorand protocol/consensus
security, node/indexer software the user points the wallet at, third-party DApp code
itself (only the wallet's handling of what a DApp sends).

## 2. Methodology

For each in-scope area:

1. **Static review** — read the actual code (not just CLAUDE.md's description of it).
   Grep for the relevant modules, trace data flow from untrusted input (DApp request,
   node response, user paste) to sensitive sink (signing, storage, display).
2. **Diff against prior audit** — if `audits/risk-registry.md` has entries, check the
   referenced files/lines still behave as previously described.
3. **Dependency check** — run (or reason from `pnpm-lock.yaml`) a check for known CVEs
   in crypto-relevant dependencies; note any outdated major versions of `algosdk`,
   `@walletconnect/*`, `@algorandfoundation/xhd-wallet-api`.
4. **Negative testing where feasible** — if Cypress/dev server is available, exercise
   at least one signing flow end-to-end and confirm displayed vs. signed data match.
   If Cypress cannot run in the environment (see CLAUDE.md's known sandboxing issue),
   say so explicitly rather than skipping verification silently.
5. **Severity rating** — use the scale in section 4. Every finding needs: description,
   affected file(s)/line(s), attacker precondition, concrete impact, and remediation.
6. Do not report a finding you have not personally traced in the current code. If
   uncertain whether something is exploitable, mark it "Needs verification" rather
   than asserting severity.

## 3. Report header (required, every audit)

Every audit report file **must** open with this metadata block, filled in accurately:

```markdown
| Field | Value |
|---|---|
| Audited commit | `<git rev-parse HEAD>` |
| Commit date | `<git log -1 --format=%cd --date=short>` |
| Branch | `<git branch --show-current>` |
| AWallet package version | `<package.json "version">` |
| Audit date | `<YYYY-MM-DD>` |
| Performed by | `<model id, e.g. claude-sonnet-5, OR human name/handle>` |
| Instruction file version | `<git log -1 --format=%h -- audits/ai-audit-instructions.md>` |
| Audit report file | `audits/reports/<YYYY-MM-DD>-<short-commit>-<auditor-slug>.md` |
| Prior audit reference | `<link to previous report in audits/reports/, or "None — first audit">` |
```

This header is what lets a future reader (or future AI) reconstruct exactly what
state of the codebase was reviewed, by whom/what, and using which version of these
instructions — since both the code and this instruction file will evolve over time.

## 4. Severity scale

| Severity | Definition |
|---|---|
| **Critical** | Direct, realistic path to loss/theft of funds or keys, or full account takeover, exploitable by a remote attacker (e.g. malicious DApp, malicious dependency) with no unusual user action. |
| **High** | Loss/theft possible but requires a specific precondition (outdated version, specific account type, non-default setting) or non-trivial user action beyond normal use. |
| **Medium** | Weakens a security property (e.g. weak KDF parameters, missing origin check) without a direct known exploitation path today. |
| **Low** | Best-practice deviation, defense-in-depth gap, or hardening opportunity with negligible standalone impact. |
| **Informational** | Observation worth recording (e.g. a dependency nearing EOL) with no current security impact. |

## 5. Output format

Write the full report to
`audits/reports/<YYYY-MM-DD>-<short-commit>-<auditor-slug>.md` (create the
`audits/reports/` folder if absent). `<auditor-slug>` is a short, filename-safe
identifier for whoever/whatever performed the audit — derived from the "Performed
by" field in the header (section 3):
- AI model: the model id with the `claude-` prefix dropped, e.g. `claude-sonnet-5`
  → `sonnet-5`, `claude-fable-5` → `fable-5`.
- Human: their handle/username, e.g. `jsmith`.

Example: `audits/reports/2026-07-09-4f915d4-sonnet-5.md`. This lets multiple audits
of the same commit by different auditors coexist without overwriting each other.
Structure:

1. Header metadata block (section 3).
2. **Executive summary** — 3-6 sentences, plain language, for a non-technical
   stakeholder: overall posture, count of findings by severity, any Critical/High
   that needs immediate action.
3. **Scope & methodology** — brief, reference this instructions file by name/version.
4. **Findings** — one subsection per finding, most severe first, each with:
   `ID` (e.g. `AW-2026-001`, incrementing across all audits — never reuse an ID),
   Title, Severity, Status (`New` / `Open (carried forward)` / `Fixed since last audit`
   / `Regressed`), Affected files, Description, Attacker precondition, Impact,
   Recommendation.
5. **Resolved since last audit** — findings from the previous report confirmed fixed,
   with the commit/PR that fixed them if identifiable.
6. **Dependency review summary**.
7. **Appendix: files reviewed** — list of files/modules actually examined, so scope
   is auditable.

Then **update `audits/risk-registry.md`**: add new findings, update status of existing
ones, and update the registry's own version-tracking header. The risk registry is
the living, cumulative record; individual dated reports in `audits/reports/` are the
point-in-time evidence for it. Never delete a risk-registry row — mark it `Closed`
and keep it, so history is preserved.

## 6. Trigger phrase for future audits

When a user says **"do new audit"** (with or without naming this file explicitly):

1. Use this file as the instruction set unless a different instructions file is named.
2. Follow sections 0-5 above in full — do not abbreviate the process, this is meant
   to be an extensive, professional-grade audit each time, not a quick pass.
3. Produce a new dated report under `audits/reports/` and update
   `audits/risk-registry.md` as described above.
4. At the end, report back a short summary: new Critical/High count, total open
   risks, and the path to the new report.

## 7. Maintaining this file

If the wallet's architecture changes in ways that shift the threat model (new account
type, new external integration, backend introduced, etc.), update section 1's scope
list accordingly as part of that change's own work — don't wait for the next audit
to notice the instructions are stale.
