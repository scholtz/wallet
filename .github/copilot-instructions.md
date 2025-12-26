# AWallet - Algorand Community Wallet

AWallet is a Vue 3-based cryptocurrency wallet for Algorand blockchain, built with TypeScript, Vue CLI, and PrimeVue components. The application is packaged as both a web application and deployed via Docker/Kubernetes.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the information here.**

## Working Effectively

### Bootstrap and Build

- Install dependencies: `CYPRESS_INSTALL_BINARY=0 npm install`
  - **NEVER CANCEL: Installation takes 20-30 seconds. Set timeout to 600+ seconds.**
  - Note: Cypress binary installation often fails due to network restrictions. The CYPRESS_INSTALL_BINARY=0 flag skips the binary download.
  - Expected warnings about deprecated packages are normal
- Build the application: `npm run build`
  - **NEVER CANCEL: Build takes 65-70 seconds. Set timeout to 180+ seconds.**
  - Outputs production files to `dist/` directory
  - Includes multiple PrimeVue theme files and assets
  - Shows webpack compilation warnings but builds successfully

### Development Server

- Start development server: `npm run serve`
  - **NEVER CANCEL: Initial compilation takes 80-90 seconds. Set timeout to 180+ seconds.**
  - Runs on `http://localhost:8080` by default
  - Includes hot module replacement
  - Shows TypeScript and ESLint warnings but runs successfully
  - Watch for "App running at: Local: http://localhost:8080/" message indicating readiness

### Production Server

- Build first: `npm run build`
- Serve production build: `npm run server`
  - **NEVER CANCEL: Command appears to hang but works correctly. Set timeout to 30+ seconds.**
  - Uses browser-sync to serve from `dist/` directory
  - Runs on port 8080
  - Access via `http://localhost:8080`

### Linting and Code Quality

- Run linting: `npm run lint`
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

### Cypress E2E Tests

- **WARNING: Cypress binary installation often fails due to network restrictions**
- Run tests: `npm run test`
  - **Will fail without Cypress binary: "The cypress npm package is installed, but the Cypress binary is missing"**
  - Do NOT attempt to install Cypress binary unless you have confirmed network access
- Alternative test commands:
  - `npm run test:open` - Opens Cypress UI (requires binary)
  - `npm run test1` - Runs specific test (requires binary)

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

### Cypress Installation Issues

- **Problem**: `npm install` fails with Cypress download errors
- **Solution**: Use `CYPRESS_INSTALL_BINARY=0 npm install`
- **Impact**: E2E tests cannot be run, but application development works normally

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
  - Uses Node 22 for build stage
  - Serves via nginx on port 8080
  - Build process includes `npm ci`, `npm run build`

### CI/CD Pipeline

- GitHub Actions workflows in `.github/workflows/`:
  - `gh-pages.yml`: Builds and deploys to GitHub Pages
  - `awallet-main.yml`: Deploys to private K8S cluster
- Build steps: `npm install` → `npm run build` → `npm run test`
- **WARNING: CI tests will fail without Cypress binary access**

## Key URLs and Access Points

### Development URLs (npm run serve)

- Main application: `http://localhost:8080/`
- Wallet creation: `http://localhost:8080/new-wallet` (auto-redirects if no wallets)
- Account creation: `http://localhost:8080/new-account/ed25519`
- Accounts overview: `http://localhost:8080/accounts`

### Production URLs (npm run server)

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

- `package.json`: Dependencies and npm scripts
- `vue.config.js`: Vue CLI configuration with crypto polyfills
- `tsconfig.json`: TypeScript configuration
- `cypress.config.ts`: Cypress test configuration
- `.eslintrc.js`: ESLint configuration

### Build Assets (`dist/` after build)

- Production-ready static files
- Multiple PrimeVue theme CSS files
- Bundled and minified JavaScript
- Service worker for PWA functionality

## Development Workflow

1. **Setup**: `CYPRESS_INSTALL_BINARY=0 npm install`
2. **Development**: `npm run serve` (wait for compilation)
3. **Testing**: Manual validation scenarios (Cypress tests require binary)
4. **Linting**: `npm run lint` before committing
5. **Building**: `npm run build` for production
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
