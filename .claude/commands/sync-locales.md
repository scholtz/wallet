---
description: Check that all locale JSON files have the same keys, in the same order, as en.json
---

`src/locales/en.json` is the source of truth. Every other file in `src/locales/` (af, cs, es, hu, it, nl, ru, sk, tr) must have identical keys in identical order, 2-space indented, newline at EOF.

1. Run `npm run check-locales` (`scripts/check-locales.js`) first — it deterministically reports missing/extra keys, order mismatches, and missing trailing newline per file. Don't hand-write an inline Node/grep comparison script; this one already exists and is faster/cheaper.
2. For missing keys, add them in the same position as `en.json`. All locale files use CRLF (`\r\n`) line endings — if you're scripting the insertion (e.g. across all 9 files at once), match `\r?\n` in your regex/anchor, not just `\n`, or the insert will silently no-op on every file.
3. Prefer a real translation over an English placeholder: 8 of the 9 locales (all except `af`, which is largely untranslated already) are substantially real-translated, so a new English-only string stands out to users as a localization bug, not a graceful fallback. Only fall back to the English value when you genuinely can't produce a reasonable translation.
4. For extra keys not in `en.json`, flag them for removal rather than deleting silently, unless clearly stale.
5. Re-run `npm run check-locales` to confirm, then report a short summary: which files were out of sync and what changed. Don't dump full file diffs.
