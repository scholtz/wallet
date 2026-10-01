# AWallet - Algorand Community Wallet

AWallet is a Vue 3-based cryptocurrency wallet for Algorand blockchain, built with TypeScript, Vue CLI, and PrimeVue components. The application is packaged as both a web application and deployed via Docker/Kubernetes.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the information here.**

## Working Effectively

### Bootstrap and Build

- Install dependencies: `pnpm install`
  - **NEVER CANCEL: Installation takes 20-30 seconds. Set timeout to 600+ seconds.**
  - Expected warnings about deprecated packages are normal
- Build the application: `pnpm run build`
  - **NEVER CANCEL: Build takes 65-70 seconds. Set timeout to 180+ seconds.**
  - Outputs production files to `dist/` directory
  - Includes multiple PrimeVue theme files and assets
  - Shows webpack compilation warnings but builds successfully

### Development Server

- Start development server: `pnpm run serve`
  - **NEVER CANCEL: Initial compilation takes 80-90 seconds. Set timeout to 180+ seconds.**
  - Runs on `http://localhost:8080` by default
  - Includes hot module replacement
  - Shows TypeScript and ESLint warnings but runs successfully
  - Watch for "App running at: Local: http://localhost:8080/" message indicating readiness

### Production Server

- Build first: `pnpm run build`
- Serve production build: `pnpm run server`
  - **NEVER CANCEL: Command appears to hang but works correctly. Set timeout to 30+ seconds.**
  - Uses browser-sync to serve from `dist/` directory
  - Runs on port 8080
  - Access via `http://localhost:8080`

### Linting and Code Quality

- Run linting: `pnpm run lint`
  - **Expected timing: 5-6 seconds**
  - Shows many warnings (83) and some errors (20) but this is expected
  - Vue template HTML structure warnings are expected
  - ESLint errors in `vue.config.js` due to obfuscated code are expected
  - Exit code 1 is normal due to ESLint errors

### Localization

- **Master File**: `src/locales/en.json` is the source of truth for all localization keys.
- **Synchronization**: All other locale files (`af.json`, `cs.json`, `es.json`, `hu.json`, `it.json`, `nl.json`, `ru.json`, `sk.json`, `tr.json`) MUST have the exact same keys in the exact same order as `en.json`.
- **Missing Translations**: If a key is missing in a target locale, it should be added. If a translation is not available, use the English value as a placeholder or attempt a translation.
- **Formatting**: Ensure all JSON files use 2-space indentation and have a newline at the end.

## Testing

### Playwright Tests (the only test framework - there is no Cypress)

- Unit tests (Node only, no browser): `pnpm run test:unit`
- E2E tests (specs in `playwright/e2e/`, shared helpers in `playwright/support/`): `pnpm run playwright:test`
  - One-time browser install: `pnpm run playwright:install`
  - The dev server is started automatically; set `STEP_DELAY_MS=0` for a fast run without the video slow-motion delay
- Everything: `pnpm run test`

### Testing policy (mandatory)

- Before finishing ANY change, run `pnpm run lint`, `pnpm run build`, `pnpm run test:unit` and `pnpm run playwright:test`; fix failures and report real results.
- Add/update tests with every change: pure logic -> `playwright/unit/*.spec.ts`; user-visible flows -> `playwright/e2e/*.spec.ts` (helpers in `playwright/support/wallet.ts`). Bug fixes need a regression test; cover main use case plus a negative case.
- Never skip/delete tests to get green. PRs must pass the `E2E Tests` and `Unit Tests` GitHub workflows before merge.

### Manual Validation Scenarios

**ALWAYS perform these manual validation steps after making changes:**

1. **Wallet Creation Flow**:

   - Navigate to homepage (shows wallet creation form)
   - Enter wallet name and password (12+ characters recommended)
   - Click "Create wallet"
   - Verify redirect to accounts page (/accounts)
   - Confirm wallet appears in dropdown on homepage after creation

2. **Account Creation Flow**:

   - From accounts page, click "Create your first account"
   - Verify mnemonic phrase generation (/new-account/ed25519)
   - Check that account address is generated
   - Verify buttons for mnemonic validation are present

3. **Navigation Testing**:

   - Test main navigation: Wallet, Payment gateway, Network selection (Mainnet), Theme switcher
   - Verify all menu items are accessible
   - Check responsive behavior

4. **Theme Switching**:

   - Click Theme dropdown in navigation
   - Select a different theme (e.g., switch from dark to light)
   - Verify theme changes are applied correctly (colors, styling)
   - Check that theme selection persists across page refreshes

5. **Language Support**:

   - Test flag-based language selector at bottom of page
   - Verify text changes for supported languages (if applicable)

6. **Wallet Management**:
   - Verify wallet dropdown shows created wallets
   - Test wallet selection and password entry form
   - Confirm wallet password field validation

## Build Output Validation

- After building, check `dist/` directory contains:
  - `index.html` (main entry point)
  - `js/` directory with compiled JavaScript bundles
  - `css/` directory with compiled CSS
  - `themes/` directory with PrimeVue theme files
  - Static assets (fonts, images, manifest files)

## Common Issues and Workarounds

### Playwright Browser Missing

- **Problem**: E2E tests fail with "Executable doesn't exist"
- **Solution**: `pnpm run playwright:install`

### TypeScript Version Warnings

- **Expected warning**: TypeScript 5.6.3 not officially supported by @typescript-eslint
- **Impact**: Does not affect build or runtime functionality

### Vue Template Warnings

- **Expected warnings**: `<tr> cannot be child of <table>` in TransactionDetail.vue
- **Impact**: Does not affect functionality, HTML still renders correctly

### Build Cache Issues

- **Problem**: Stale browserslist data warnings
- **Solution**: Run `npx update-browserslist-db@latest` (optional)
- **Impact**: Does not affect build success

## Deployment

### Docker Deployment

- Build Docker image: `cd docker && ./compose.sh`
  - Uses Node 26 for build stage
  - Serves via nginx on port 8080
  - Build process includes `pnpm install --frozen-lockfile`, `pnpm run build`

### CI/CD Pipeline

- GitHub Actions workflows in `.github/workflows/`:
  - `gh-pages.yml`: Builds and deploys to GitHub Pages
  - `awallet-main.yml`: Deploys to private K8S cluster
- Build steps: `pnpm install` → `pnpm run build` → `pnpm run test`
- E2E tests need a Playwright Chromium (`pnpm run playwright:install`)

## Key URLs and Access Points

### Development URLs (pnpm run serve)

- Main application: `http://localhost:8080/`
- Wallet creation: `http://localhost:8080/new-wallet` (auto-redirects if no wallets)
- Account creation: `http://localhost:8080/new-account/ed25519`
- Accounts overview: `http://localhost:8080/accounts`

### Production URLs (pnpm run server)

- Main application: `http://localhost:8080/`
- Same URL structure as development

### Application Routes

- `/` - Homepage with wallet selection or creation
- `/new-wallet` - Wallet creation form
- `/accounts` - Accounts overview and management
- `/new-account/ed25519` - Basic account creation
- `/payment-gateway` - Payment gateway features

### Key Project Structure

### Source Code (`src/`)

- `App.vue`: Main application component with gradient background
- `main.ts`: Application entry point with PrimeVue setup
- `components/`: Reusable Vue components
- `pages/`: Application pages/routes
- `store/`: Vuex state management modules
- `router/`: Vue Router configuration
- `locales/`: Internationalization files

### Configuration Files

- `package.json`: Dependencies and pnpm scripts
- `vue.config.js`: Vue CLI configuration with crypto polyfills
- `tsconfig.json`: TypeScript configuration
- `playwright.config.ts` / `playwright.unit.config.ts`: Playwright E2E / unit test configuration
- `.eslintrc.js`: ESLint configuration

### Build Assets (`dist/` after build)

- Production-ready static files
- Multiple PrimeVue theme CSS files
- Bundled and minified JavaScript
- Service worker for PWA functionality

## Development Workflow

1. **Setup**: `pnpm install`
2. **Development**: `pnpm run serve` (wait for compilation)
3. **Testing**: Playwright tests (`pnpm run test`) plus manual validation scenarios
4. **Linting**: `pnpm run lint` before committing
5. **Building**: `pnpm run build` for production
6. **Validation**: Test wallet creation and navigation flows

## Performance Notes

- Dependencies installation: 20-30 seconds
- Production build: 65-70 seconds
- Development server initial compilation: 80-90 seconds
- Production server startup: ~10 seconds (appears to hang but normal)
- Application startup after server ready: ~2-3 seconds
- Theme switching: Instant
- Wallet operations: Near-instant for local operations
- Linting: 5-6 seconds

**CRITICAL**: Always wait for builds and compilations to complete. Do not cancel long-running commands. The application has many dependencies and complex webpack configuration that requires adequate time to process.
