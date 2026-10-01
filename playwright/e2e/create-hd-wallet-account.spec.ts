import { test, expect } from "@playwright/test";
import { chooseNewAccountMenuItem, setupFreshWallet } from "../support/wallet";

test("create a wallet and a second, manually confirmed HD account", async ({
  page,
}) => {
  await setupFreshWallet(page);
  await expect(page.locator(".p-menubar")).toBeVisible();

  await chooseNewAccountMenuItem(page, "HD Wallet account");
  await expect(page).toHaveURL(/\/new-account\/hd-wallet/);
  await page.locator("#name").fill("Second HD Account");
  // Confirming the backup up front means no "not backed up" warning later.
  await page.locator("#confirmedBackup").click({ force: true });
  await page.locator("#create_hd_account").click();

  await page.waitForURL(/\/account\//, { timeout: 15000 });
  await expect(page.locator("h1")).toContainText("Second HD Account");
  await expect(page.locator("h1")).toContainText("Account overview");
  await expect(page.getByText("This account is not backed up!")).toHaveCount(0);
});
