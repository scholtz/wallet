import { Page, expect } from "@playwright/test";

export async function clearAWalletDB(page: Page) {
  await page.goto("/");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase("AWallet");
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve();
        deleteRequest.onblocked = () => resolve();
        setTimeout(() => resolve(), 1000);
      })
  );
}

export const DEFAULT_WALLET_PASSWORD = "TestPassword123";

/** Navbar: Wallet > New account > <item> (hover submenu, hence forced clicks). */
export async function chooseNewAccountMenuItem(page: Page, item: string) {
  await page.getByText("Wallet", { exact: true }).click({ force: true });
  await page.getByText("New account", { exact: true }).hover({ force: true });
  await page.getByText(item, { exact: true }).click({ force: true });
}

/**
 * Clears the DB, creates a wallet and waits for the overview of the
 * auto-created first (not yet backed up) HD account.
 */
export async function setupFreshWallet(
  page: Page,
  walletName = "Test Wallet",
  password = DEFAULT_WALLET_PASSWORD
) {
  await clearAWalletDB(page);
  await page.goto("/new-wallet");
  await createTestWallet(page, walletName, password);
  await page.waitForURL(/\/account\//, { timeout: 30000 });
  await expect(page.locator("h1")).toContainText("Account overview");
}

export async function createTestWallet(
  page: Page,
  walletName = "Test Wallet",
  password = "TestPassword123"
) {
  await expect(page.locator("#newwallet-name")).toBeVisible();
  await page.locator("#newwallet-name").fill(walletName);
  await page.locator("#newwallet-pass").fill(password);

  // Click elsewhere to close the password-strength overlay - otherwise it
  // keeps intercepting pointer events over the create button below it.
  await page.locator("#newwallet-name").click();
  await page.waitForTimeout(500);

  const createButton = page.locator("#new_wallet_button_create");
  await createButton.scrollIntoViewIfNeeded();
  await createButton.click({ force: true });

  await page.waitForURL((url) => !url.pathname.includes("/new-wallet"), {
    timeout: 15000,
  });
}

interface AppStore {
  state: { wallet: { lastActiveAccount: string; lastPayTo: string } };
  dispatch: (type: string, payload?: object) => Promise<unknown>;
}
interface AppRouter {
  push: (path: string) => Promise<unknown>;
}
interface AppHost extends Element {
  __vue_app__?: {
    config: { globalProperties: { $store: AppStore; $router: AppRouter } };
  };
}

/**
 * In-app navigation (vue-router push). A `page.goto` reload would lock the wallet, so a spec that
 * needs a route without a menu path uses this instead.
 */
export async function spaNavigate(page: Page, path: string) {
  await page.evaluate(async (target) => {
    const host = document.querySelector("#app") as AppHost | null;
    await host?.__vue_app__?.config.globalProperties.$router.push(target);
  }, path);
}

/** The wallet's currently active (last used) account address. */
export async function activeAccount(page: Page): Promise<string> {
  return page.evaluate(() => {
    const host = document.querySelector("#app") as AppHost | null;
    return host?.__vue_app__?.config.globalProperties.$store.state.wallet.lastActiveAccount ?? "";
  });
}

/** Dispatches a Vuex action the way the app itself would (e.g. the user's earlier choice). */
export async function dispatchStore(page: Page, type: string, payload?: object) {
  await page.evaluate(
    async ([t, p]) => {
      const host = document.querySelector("#app") as AppHost | null;
      await host?.__vue_app__?.config.globalProperties.$store.dispatch(t as string, p as object);
    },
    [type, payload] as [string, object | undefined],
  );
}
