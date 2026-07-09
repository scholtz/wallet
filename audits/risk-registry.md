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
| Last updated by audit report | `<audits/reports/YYYY-MM-DD-<commit>.md>` |
| Last updated (audited commit) | `<git rev-parse HEAD>` |
| Last updated (commit date) | `<YYYY-MM-DD>` |
| Last updated (AWallet package version) | `<package.json "version">` |
| Last updated by | `<model id, e.g. claude-sonnet-5, OR human name/handle>` |
| Instructions file version used | `<git log -1 --format=%h -- audits/ai-audit-instructions.md>` |

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
| _(none yet — first audit pending)_ | | | | | | | |

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

_(none yet)_
