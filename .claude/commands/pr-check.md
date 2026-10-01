---
description: Run the standard pre-commit gate-- lint, typecheck, build, unit + E2E tests
---

Run in sequence, stopping at the first failure:
1. `pnpm run lint`
2. `pnpm run check-typescript-errors-vue`
3. `pnpm run build`
4. `ppnpm run test:unit`
5. `STEP_DELAY_MS=0 ppnpm run playwright:test`
6. If any file under `src/locales/` changed in this diff, also run `pnpm run check-locales`.

Report only a pass/fail line per step and details for the first failure. Pre-existing lint warnings are expected; don't treat them as failures.
