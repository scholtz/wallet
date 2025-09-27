# Test Runner Scripts

This directory contains scripts to properly handle Cypress test execution in different environments.

## Scripts

### `wait-for-server.js`
Waits for the AWallet server to be available at http://localhost:8083 before proceeding.
- Retries for up to 30 seconds with 1-second intervals
- Used to ensure server is ready before running tests

### `run-tests.js` 
Main test runner that:
1. Checks if Cypress binary is available
2. If not available (CI/CD environments), gracefully skips tests
3. If available, ensures app is built, starts server, waits for it to be ready, then runs tests
4. Properly cleans up server process when done

### `run-test-with-server.js`
Individual test runner for specific test files that:
1. Checks if Cypress binary is available
2. If not available, gracefully skips tests  
3. If available, ensures app is built, starts server, then runs the specified Cypress command
4. Used by individual test scripts like `test:basic`, `test:ed25519`, `test:arc76`

## Problem Solved

The original issue was that Cypress tests failed with **404 errors** instead of meaningful error messages:

### Before Fix
- `npm run test` used `run-p -r server cypress:run` which caused race conditions
- The `-r/--race` flag kills all processes when one exits  
- When Cypress binary was missing, Cypress failed immediately
- This killed the server before it could start, causing **404 connection errors**
- Individual test scripts ran Cypress directly without starting a server
- Developers saw confusing "connection refused" instead of "binary missing" messages

### After Fix
1. **Main test runner**: Uses `run-tests.js` for proper sequencing and error handling
2. **Individual test scripts**: Use `run-test-with-server.js` to ensure server is started
3. **Automatic build check**: Ensures `dist` directory exists before starting server
4. **Graceful degradation**: In CI environments without Cypress binary, tests are skipped with clear messaging
5. **Fixed parallel scripts**: Removed `-r` flag to prevent race conditions
6. **Clear error messages**: Missing Cypress binary is reported clearly instead of network errors

## Usage

```bash
# Main test command (recommended) - handles everything automatically
npm run test

# Individual test commands - now start server automatically  
npm run test:basic      # Basic application load test
npm run test:ed25519    # ED25519 account creation test
npm run test:arc76      # ARC76 account creation test

# Parallel execution (requires Cypress binary and manual server management)
npm run test:parallel   # Fixed version without race conditions
npm run test:video      # Parallel with video recording
npm run test:open       # Open Cypress UI

# Utility commands
npm run test:prepare    # Just build the app
npm run server          # Start production server manually
```

## For CI/CD Environments

When Cypress binary cannot be installed (common in network-restricted environments):
- All test commands gracefully skip with clear messaging
- No more 404 errors or confusing connection failures  
- Exit code 0 (success) so CI/CD pipelines don't fail unnecessarily
- Clear logs indicate why tests were skipped

## For Local Development

When Cypress binary is available:
- Tests run with proper server startup sequencing
- Automatic build verification ensures `dist` directory exists
- Server cleanup happens automatically after tests complete
- Clear progress indicators show what's happening at each step