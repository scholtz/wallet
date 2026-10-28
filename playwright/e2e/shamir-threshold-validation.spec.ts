import { test, expect } from "@playwright/test";
import {
  chooseNewAccountMenuItem,
  clearAWalletDB,
  createTestWallet,
} from "../support/wallet";

// AW-2026-099: a Shamir backup needs a threshold of at least 2 that the number of shares can meet.

const WALLET_PASSWORD = "TestPassword123";

test("the Shamir export refuses a threshold of 1 or above the number of shares", async ({
  page,
}) => {
  await clearAWalletDB(page);
  await page.goto("/new-wallet");
  await createTestWallet(page, "Test Wallet", WALLET_PASSWORD);
  await expect(page).toHaveURL(/\/account\//);
  await chooseNewAccountMenuItem(page, "Create basic account");
  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  await page.locator("#name").fill("Basic Account");
  await page.locator("#skip_challange").click();
  await page.waitForURL(/\/account\//, { timeout: 15000 });

  await page.locator(".p-tabmenu").getByText("Actions", { exact: true }).click({ force: true });
  await page.locator('.p-card a[href*="/account/export/"]').click({ force: true });
  await expect(page).toHaveURL(/\/account\/export\//);
  await page.locator("#pwd").fill(WALLET_PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Shamir backup", exact: true }).click();

  const generate = page.getByRole("button", { name: "Generate shamir mnemonics", exact: true });

  // A threshold of 1 would make a single share the secret itself.
  await page.locator("#shamirMin").fill("1");
  await page.locator("#shamirCount").fill("3");
  await generate.click();
  await expect(page.getByText(/recovery threshold must be at least 2/i).first()).toBeVisible();
  await expect(page.locator("code")).toHaveCount(0);

  // A threshold above the number of shares could never be met.
  await page.locator("#shamirMin").fill("4");
  await page.locator("#shamirCount").fill("3");
  await generate.click();
  await expect(page.locator("code")).toHaveCount(0);

  // A valid choice still works.
  await page.locator("#shamirMin").fill("2");
  await page.locator("#shamirCount").fill("3");
  await generate.click();
  await expect(page.locator("code")).toBeVisible();
});
