---
description: Check that all locale JSON files have the same keys, in the same order, as en.json
---

`src/locales/en.json` is the source of truth. Every other file in `src/locales/` (af, cs, es, hu, it, nl, ru, sk, tr) must have identical keys in identical order, 2-space indented, newline at EOF.

1. Compare each locale file's key set/order against `en.json`.
2. For missing keys, add them — use the English value as a placeholder if no translation is readily known.
3. For extra keys not in `en.json`, flag them for removal rather than deleting silently, unless clearly stale.
4. Report a short summary: which files were out of sync and what changed. Don't dump full file diffs.
