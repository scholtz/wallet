import { test, expect } from "@playwright/test";
import { clearAWalletDB, createTestWallet } from "../support/wallet";

const HD_MNEMONIC =
  "soup wet release six craft offer matter open cotton stuff advance bomb boat indicate refuse icon retire behind loud cement range arch print reveal";
const HD_ADDRESS = "3HTMYRJO5URBLNGZDHEGCXUPAUGR6LRZZ5YZBLATWLFY7OEPJL53VQO5TE";
const ALGOD_HOST = "https://testnet-api.4160.nodely.dev";
const INDEXER_HOST = "https://testnet-idx.4160.nodely.dev";
// https://lora.algokit.io/testnet/account/3HTMYRJO5URBLNGZDHEGCXUPAUGR6LRZZ5YZBLATWLFY7OEPJL53VQO5TE

test("import HD account from mnemonic, switch to a custom testnet node, and send a 1 Algo self-payment", async ({
  page,
}) => {
  // Real testnet round-trips (account load + tx confirmation) on top of the
  // recording slowMo need more headroom than the default timeout.
  test.setTimeout(240000);

  await clearAWalletDB(page);

  await page.goto("/new-wallet");
  await createTestWallet(page);
  await expect(page.getByRole("menubar").first()).toBeVisible();

  // --- Import the HD account from the known mnemonic ---
  await page.getByText("Wallet", { exact: true }).click({ force: true });
  await page.getByText("New account", { exact: true }).hover({ force: true });
  await page
    .getByText("HD Wallet account", { exact: true })
    .click({ force: true });

  await expect(page).toHaveURL(/\/new-account\/hd-wallet/);
  await page
    .getByRole("button", { name: "Import existing mnemonic", exact: true })
    .click();
  await page.locator("#mn").fill(HD_MNEMONIC);
  await page.locator("#name").fill("HD Import");
  await expect(page.locator("#create_hd_account")).toBeEnabled();
  await page.locator("#create_hd_account").click();

  // The derived address must match the known first (index 0) account of
  // this mnemonic.
  await page.waitForURL(/\/account\//, { timeout: 15000 });
  const importedAddress = page.url().split("/account/")[1];
  expect(importedAddress).toEqual(HD_ADDRESS);

  // --- Switch to the "Custom" network with testnet nodely endpoints ---
  // The env menu is labeled with the current network name ("Algorand
  // Mainnet" when public data loaded, "Mainnet" preset fallback otherwise).
  await page.getByText(/Mainnet$/).click({ force: true });
  await page.getByText("Settings", { exact: true }).click({ force: true });
  await expect(page).toHaveURL(/\/settings/);

  await page.locator("#env2").click();
  const envOverlay = page.locator(".p-select-overlay");
  await expect(envOverlay).toBeVisible();
  await envOverlay.locator(".p-select-option", { hasText: "Custom" }).click();

  // Host inputs are editable only on the custom network.
  await expect(page.locator("#algodHost")).toBeEnabled();
  await page.locator("#algodHost").fill(ALGOD_HOST);
  await page.locator("#indexerHost").fill(INDEXER_HOST);

  // --- Back to the account overview (in-app - a page.goto reload would log
  // the unlocked wallet out) so the balance loads from the testnet indexer,
  // giving the Pay form a real max amount to validate against. ---
  await page
    .getByText("HD Import", { exact: true })
    .first()
    .click({ force: true });
  await page.getByText("Overview", { exact: true }).click({ force: true });
  await expect(page).toHaveURL(`/account/${HD_ADDRESS}`);
  // AccountOverview renders its field rows only once the account data for
  // the active (custom) network has loaded from the configured indexer.
  await expect(page.getByText("Amount", { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });

  // --- Build the self-payment: 1 Algo to itself with note biatec-wallet ---
  await page
    .locator(".p-tabmenu")
    .getByText("Actions", { exact: true })
    .click({ force: true });
  await expect(page).toHaveURL(/\/account\/actions\//);
  await page
    .locator('.p-card a[href*="/accounts/pay/"]')
    .click({ force: true });
  await expect(page).toHaveURL(/\/accounts\/pay\//);

  await page
    .getByText("Pay to other account", { exact: true })
    .click({ force: true });
  await page.locator("#payTo").fill(HD_ADDRESS);

  const amountInput = page.locator(".p-inputnumber-input").first();
  await amountInput.fill("1");
  await amountInput.press("Tab");

  await page.locator("#paynote").fill("biatec-wallet");

  await page
    .getByRole("button", { name: "Review payment", exact: true })
    .click();

  // With the custom network fix in place, preparePayment must accept the
  // node's testnet genesis and redirect to the sign page instead of toasting
  // the "does not match the selected network" refusal.
  await page.waitForURL(/\/sign\//, { timeout: 30000 });
  await expect(page.getByText(/does not match/)).toHaveCount(0);

  // --- Sign and submit, then wait for on-chain confirmation ---
  await page
    .getByRole("button", { name: "Sign transaction", exact: true })
    .click();
  const sendButton = page.getByRole("button", {
    name: "Send tx to the network",
  });
  await expect(sendButton).toBeEnabled();
  await sendButton.click();

  await expect(
    page.getByText(
      "Confirmation has been received. Your payment is in the block",
    ),
  ).toBeVisible({ timeout: 60000 });
});
