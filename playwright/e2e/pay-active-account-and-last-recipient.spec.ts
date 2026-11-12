import { test, expect, Page } from "@playwright/test";
import {
  DEFAULT_WALLET_PASSWORD,
  activeAccount,
  chooseNewAccountMenuItem,
  dispatchStore,
  setupFreshWallet,
  spaNavigate,
} from "../support/wallet";

// A valid Algorand address that is not part of the wallet.
const RECIPIENT = "3HTMYRJO5URBLNGZDHEGCXUPAUGR6LRZZ5YZBLATWLFY7OEPJL53VQO5TE";

interface EnvHost extends Element {
  __vue_app__?: { config: { globalProperties: { $store: { state: { config: { env: string } } } } } };
}
const envOf = (page: Page) =>
  page.evaluate(
    () =>
      (document.querySelector("#app") as EnvHost | null)?.__vue_app__?.config.globalProperties
        .$store.state.config.env ?? "",
  );

const addressFromUrl = (page: Page) => page.url().split("/account/")[1];

/** Creates a wallet (first account A) and a second ED25519 account B named "Second". */
async function walletWithTwoAccounts(page: Page) {
  await setupFreshWallet(page);
  const accountA = addressFromUrl(page);
  await chooseNewAccountMenuItem(page, "Create basic account");
  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  await page.locator("#name").fill("Second");
  await page.locator("#skip_challange").click();
  await page.waitForURL(/\/account\//, { timeout: 15000 });
  const accountB = addressFromUrl(page);
  expect(accountB).not.toEqual(accountA);
  return { accountA, accountB };
}

test.describe("Pay: the active account", () => {
  test("opening the pay page for another account does not change the active account", async ({
    page,
  }) => {
    const { accountA, accountB } = await walletWithTwoAccounts(page);

    // The user's own choice: A is the active account.
    await dispatchStore(page, "wallet/lastActiveAccount", { addr: accountA });
    expect(await activeAccount(page)).toBe(accountA);

    await spaNavigate(page, `/accounts/pay/${accountB}`);
    await expect(page.getByText("Pay to other account", { exact: true })).toBeVisible();
    await expect(page.locator("h1")).toContainText("Second");

    // Paying from B is not a request to switch to B.
    expect(await activeAccount(page)).toBe(accountA);
  });

  test("a payment link keeps the active account; only picking a sender in the selector changes it", async ({
    page,
  }) => {
    const { accountA, accountB } = await walletWithTwoAccounts(page);
    await dispatchStore(page, "wallet/lastActiveAccount", { addr: accountA });

    await spaNavigate(page, `/pay/${RECIPIENT}`);
    const selector = page.locator(".p-select").first();
    await expect(selector).toBeVisible();

    // The sender was pre-filled from the active account; nothing switched.
    expect(await activeAccount(page)).toBe(accountA);

    // The user explicitly picks the other account: now the active account follows.
    await selector.click();
    await page.locator(".p-select-overlay .p-select-option", { hasText: "Second" }).click();
    await expect.poll(() => activeAccount(page)).toBe(accountB);
  });
});

test.describe("Pay: the last recipient", () => {
  test("the pay page pre-fills the last recipient, also after the wallet is locked and reopened", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Recipient Wallet");
    const account = addressFromUrl(page);

    // Nothing was paid yet: the recipient field is empty.
    await spaNavigate(page, `/accounts/pay/${account}`);
    await page.getByText("Pay to other account", { exact: true }).click();
    await expect(page.locator("#payTo")).toHaveValue("");

    // The wallet remembers the recipient of a confirmed payment (the Sign page dispatches this
    // after confirmation; a real confirmation needs a funded account on a live network).
    await dispatchStore(page, "wallet/lastPayTo", { addr: RECIPIENT });

    // Leave the page and come back: the form is built again when the page opens.
    await spaNavigate(page, "/accounts");
    await spaNavigate(page, `/accounts/pay/${account}`);
    await page.getByText("Pay to other account", { exact: true }).click();
    await expect(page.locator("#payTo")).toHaveValue(RECIPIENT);

    // It is persisted with the wallet: lock, reopen, and it is still offered.
    await page.getByText("Wallet", { exact: true }).click({ force: true });
    await page.getByText("Logout", { exact: true }).click({ force: true });
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();
    await page.locator("#wallet-pass").fill(DEFAULT_WALLET_PASSWORD);
    await page.locator("#new_wallet_button_open").click();
    await page.waitForURL(/\/account\//, { timeout: 30000 });
    await expect(page.locator("h1")).toContainText("Account overview");

    await spaNavigate(page, `/accounts/pay/${account}`);
    await page.getByText("Pay to other account", { exact: true }).click();
    await expect(page.locator("#payTo")).toHaveValue(RECIPIENT);
  });

  test("a payment link's recipient wins over the remembered one", async ({ page }) => {
    await setupFreshWallet(page, "Link Wallet");
    const account = addressFromUrl(page);
    await dispatchStore(page, "wallet/lastPayTo", {
      addr: "7ZUECA7HFLZTXENRV24SHLU4AQAIWE5OZSXMEYJEXZYPCZTRYUJDKXZZPM",
    });

    await spaNavigate(page, `/accounts/payTo/${account}/${RECIPIENT}/0`);
    await page.getByText("Pay to other account", { exact: true }).click();
    await expect(page.locator("#payTo")).toHaveValue(RECIPIENT);
  });
});

test.describe("Pay: payment link network (AW-2026-102)", () => {
  test("a link naming an unknown network is refused once and applies nothing", async ({ page }) => {
    await setupFreshWallet(page, "Network Wallet");
    const envBefore = await envOf(page);
    let dialogs = 0;
    page.on("dialog", (dialog) => {
      dialogs++;
      void dialog.dismiss();
    });

    await spaNavigate(page, `/pay/${encodeURIComponent(`algorand://${RECIPIENT}?amount=1&network=custom`)}`);
    await expect(page.getByText(/was not applied|did not confirm/).first()).toBeVisible();

    // Unknown network: no confirmation is even offered, nothing of the link is applied and the
    // wallet stays on its network.
    expect(dialogs).toBe(0);
    expect(await envOf(page)).toBe(envBefore);
    // The sender selector is shown, the recipient from the link was never applied.
    await expect(page.locator("#payTo")).toHaveCount(0);
  });

  test("a link naming a known other network asks for confirmation and declining keeps the network", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Confirm Wallet");
    const envBefore = await envOf(page);
    let dialogs = 0;
    page.on("dialog", (dialog) => {
      dialogs++;
      void dialog.dismiss();
    });

    await spaNavigate(page, `/pay/${encodeURIComponent(`algorand://${RECIPIENT}?network=testnet-v1.0`)}`);
    await expect.poll(() => dialogs).toBe(1);
    await page.waitForTimeout(1500);
    expect(dialogs).toBe(1);
    expect(await envOf(page)).toBe(envBefore);
  });
});
