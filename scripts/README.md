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
3. If available, starts server, waits for it to be ready, then runs tests
4. Properly cleans up server process when done

## Problem Solved

The original `npm run test` command used `run-p -r server cypress:run` which caused race conditions:
- The `-r/--race` flag kills all processes when one exits
- When Cypress binary is missing, Cypress fails immediately  
- This kills the server before it can start, causing 404 errors
- Tests fail with "connection refused" instead of meaningful error messages

## Solution

1. **New `npm run test`**: Uses `run-tests.js` for proper sequencing and error handling
2. **Updated parallel scripts**: Removed `-r` flag to prevent race conditions
3. **Graceful degradation**: In CI environments without Cypress binary, tests are skipped with clear messaging
4. **Better local development**: When binary is available, tests run with proper server startup sequencing

## Usage

```bash
# Main test command (recommended)
npm run test

# Parallel execution (requires Cypress binary)
npm run test:parallel

# Specific test types
npm run test:basic
npm run test:ed25519  
npm run test:arc76

# With video recording
npm run test:video

# Open Cypress UI
npm run test:open
```