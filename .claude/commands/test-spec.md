---
description: Run one Cypress spec against an auto-started server (usage-- /test-spec <path under cypress/e2e/>)
---

Spec path: $ARGUMENTS

If no argument was given, ask which spec under `cypress/e2e/` to run (list the numbered subfolders if helpful) instead of guessing.

Otherwise run:
`node scripts/run-test-with-server.js cypress run --config-file cypress.config.video.ts --spec 'cypress/e2e/<path>'`

Note: this requires the Cypress binary, which often fails to install on restricted networks. If the run fails with "Cypress binary is missing", say so plainly rather than retrying installs.
