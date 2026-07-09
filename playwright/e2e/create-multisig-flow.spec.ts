import { test, expect } from "@playwright/test";
import { clearAWalletDB, createTestWallet } from "../support/wallet";

test("create wallet, HD root + next account, basic account, then a 2-of-3 multisig account", async ({
  page,
}) => {
  await clearAWalletDB(page);

  await page.goto("/new-wallet");
  await expect(page.locator("#newwallet-name")).toBeVisible();
  await expect(page.locator("#newwallet-pass")).toBeVisible();
  await expect(page.locator("#new_wallet_button_create")).toBeVisible();

  await createTestWallet(page);
  await expect(page.locator("nav")).toBeVisible();

  // --- Create the HD root account via the navbar menu ---
  await page.getByText("Wallet", { exact: true }).click({ force: true });
  await page
    .getByText("New account", { exact: true })
    .hover({ force: true });
  await page
    .getByText("HD Wallet account", { exact: true })
    .click({ force: true });

  await expect(page).toHaveURL(/\/new-account\/hd-wallet/);
  await expect(page.locator("#confirmedBackup")).toBeVisible();
  await page.locator("#confirmedBackup").click({ force: true });
  await page.locator("#name").fill("HD Root Account");
  await expect(page.locator("#create_hd_account")).toBeVisible();
  await page.locator("#create_hd_account").click();

  await page.waitForURL(/\/account\//, { timeout: 15000 });
  await expect(page.locator("h1")).toContainText("HD Root Account");
  await expect(page.locator("h1")).toContainText("Account overview");
  const rootAddress = page.url().split("/account/")[1];

  // --- Generate the next account for the same HD root ---
  // Navigate via the in-app tab (not page.goto) so the unlocked wallet
  // session in the Vuex store survives - a full page reload logs the
  // wallet back out and would land on the "Open wallet" password screen.
  await page
    .locator(".p-tabmenu")
    .getByText("Generate next HD account", { exact: true })
    .click({ force: true });

  await expect(page).toHaveURL(/\/account\/hd-next\//);
  await page.locator("#name").fill("HD Account 1");
  await page.locator("#generate_hd_account").click();

  await page.waitForURL(/\/account\//, { timeout: 15000 });
  await expect(page.locator("h1")).toContainText("HD Account 1");
  const hdNextAddress = page.url().split("/account/")[1];
  expect(hdNextAddress).not.toEqual(rootAddress);

  // --- Create a basic ed25519 account ---
  await page.getByText("Wallet", { exact: true }).click({ force: true });
  await page
    .getByText("New account", { exact: true })
    .hover({ force: true });
  await page
    .getByText("Create basic account", { exact: true })
    .click({ force: true });

  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  await page.locator("#name").fill("Basic Account");
  await page.locator("#skip_challange").click();

  await page.waitForURL(/\/account\//, { timeout: 15000 });
  await expect(page.locator("h1")).toContainText("Basic Account");

  // --- Combine all 3 accounts into a 2-of-3 multisig account ---
  await page.getByText("Wallet", { exact: true }).click({ force: true });
  await page
    .getByText("New account", { exact: true })
    .hover({ force: true });
  await page
    .getByText("Create multisign account", { exact: true })
    .click({ force: true });

  await expect(page).toHaveURL(/\/new-account\/multisig/);

  await page.locator("#accounts").click();
  const panel = page.locator(".p-multiselect-overlay");
  await expect(panel).toBeVisible();
  for (const name of ["HD Root Account", "HD Account 1", "Basic Account"]) {
    await panel.locator(".p-multiselect-option", { hasText: name }).click();
  }
  await page.keyboard.press("Escape");

  const threshold = page.locator("#threshold");
  await threshold.click();
  await threshold.fill("2");
  await threshold.blur();

  await page.locator("#name").fill("Multisig 2-of-3");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();

  await page.waitForURL(/\/accounts/, { timeout: 15000 });
  await expect(
    page.getByRole("cell", { name: "Multisig 2-of-3" })
  ).toBeVisible();
});
