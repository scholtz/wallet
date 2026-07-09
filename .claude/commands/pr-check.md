---
description: Run the standard pre-commit gate-- lint, typecheck, build
---

Run in sequence, stopping at the first failure:
1. `npm run lint`
2. `npm run check-typescript-errors-vue`
3. `npm run build`
4. If any file under `src/locales/` changed in this diff, also run `npm run check-locales`.

Report only a pass/fail line per step and details for the first failure. Pre-existing lint warnings are expected; don't treat them as failures.
