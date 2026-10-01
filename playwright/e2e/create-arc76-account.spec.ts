import { test, expect } from "@playwright/test";
import { chooseNewAccountMenuItem, setupFreshWallet } from "../support/wallet";

test("create a wallet and then an ARC76 (email & password) account", async ({
  page,
}) => {
  await setupFreshWallet(page);
  await expect(page.locator(".p-menubar")).toBeVisible();

  await chooseNewAccountMenuItem(page, "Email & Password account");
  await expect(page).toHaveURL(/\/new-account\/email-password/);
  await expect(page.locator("#email")).toBeVisible();

  const email = "test@example.com";
  // Email validity is evaluated on keyup, so type it instead of fill().
  await page.locator("#email").pressSequentially(email);
  await page.locator("#w").fill(email.repeat(4));
  await page.locator("#name").fill("ARC76 Account");

  const create = page.locator("#create_account");
  await expect(create).toBeVisible();
  await expect(create).toBeEnabled();
  await create.click();

  await page.waitForURL(/\/account\//, { timeout: 30000 });
  await expect(page.locator("h1")).toContainText("ARC76 Account");
  await expect(page.locator("h1")).toContainText("Account overview");
});

test("ARC76 account creation is disabled for a too short password", async ({
  page,
}) => {
  await setupFreshWallet(page);
  await chooseNewAccountMenuItem(page, "Email & Password account");
  await expect(page).toHaveURL(/\/new-account\/email-password/);
  await page.locator("#email").pressSequentially("test@example.com");
  await page.locator("#w").fill("short");
  await page.locator("#name").fill("Weak");
  await expect(page.locator("#create_account")).toBeDisabled();
});
