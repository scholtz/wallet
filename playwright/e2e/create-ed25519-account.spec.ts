import { test, expect } from "@playwright/test";
import { chooseNewAccountMenuItem, setupFreshWallet } from "../support/wallet";

test("create a wallet and then a basic ED25519 account", async ({ page }) => {
  await setupFreshWallet(page);
  await expect(page.locator(".p-menubar")).toBeVisible();

  await chooseNewAccountMenuItem(page, "Create basic account");
  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  await page.locator("#name").fill("Test Account");
  await page.locator("#skip_challange").click();

  await page.waitForURL(/\/account\//, { timeout: 15000 });
  await expect(page.locator("h1")).toContainText("Test Account");
  await expect(page.locator("h1")).toContainText("Account overview");
});
