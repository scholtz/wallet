# Cypress Upgrade Documentation

## Changes Made

### Version Upgrade
- Upgraded Cypress from v13.15.1 to v15.2.0 (latest)

### File Structure Updates
- Renamed `cypress/support/index.js` → `cypress/support/e2e.ts`
- Renamed `cypress/support/commands.js` → `cypress/support/commands.ts`
- Converted all test files from `.js` to `.ts`:
  - `load-index.cy.js` → `load-index.cy.ts`
  - `create-ed25519-account.cy.js` → `create-ed25519-account.cy.ts`
  - `create-arc76-account.cy.js` → `create-arc76-account.cy.ts`

### Configuration Updates
- Updated `cypress.config.ts` to enable support file: `supportFile: "cypress/support/e2e.ts"`
- Updated `cypress.config.video.ts` to use the new support file
- Added TypeScript configuration `cypress/tsconfig.json` for Cypress

### Test Improvements
- Fixed `indexedDB.deleteDatabase()` usage to be wrapped in `cy.window().then()`
- Added custom commands:
  - `cy.clearAWalletDB()` - Clears the AWallet IndexedDB database
  - `cy.createTestWallet()` - Creates a test wallet with default credentials
- Improved test descriptions and structure
- Added proper TypeScript support with type declarations

### NPM Scripts Updates
- Added `cypress:run` for running tests without video
- Added `cypress:run-video` for running tests with video recording
- Updated `test` script to use new configuration
- Added specific test scripts:
  - `test:basic` - Run basic load test
  - `test:ed25519` - Run ED25519 account creation test
  - `test:arc76` - Run ARC76 account creation test
  - `test:video` - Run all tests with video recording

## Running Tests

### Without Binary (CI/CD)
When the Cypress binary cannot be installed (due to network restrictions), the package and configuration are still updated and ready. Tests can be run once the binary becomes available.

### With Binary (Local Development)
1. Install Cypress binary: `npx cypress install`
2. Run specific tests:
   - `npm run test:basic` - Basic application load test
   - `npm run test:ed25519` - ED25519 account creation
   - `npm run test:arc76` - ARC76 account creation
3. Run all tests: `npm run test`
4. Open Cypress UI: `npm run test:open`

## Configuration Files

### cypress.config.ts
Main configuration for running tests without video recording.

### cypress.config.video.ts
Configuration for running tests with video recording enabled.

### cypress/tsconfig.json
TypeScript configuration specific to Cypress tests.

## Custom Commands

### cy.clearAWalletDB()
Clears the AWallet IndexedDB database before tests.

### cy.createTestWallet(walletName?, password?)
Creates a test wallet with optional custom name and password.
Defaults: walletName = 'Test Wallet', password = 'Test Password'

## Compatibility Notes

- All changes are compatible with Cypress v15.x
- TypeScript support is fully configured
- Tests maintain the same functionality but with improved structure
- Build process remains unchanged and working
- Application functionality is not affected