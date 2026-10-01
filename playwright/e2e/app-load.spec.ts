import { test, expect } from "@playwright/test";
import { clearAWalletDB } from "../support/wallet";

test.describe("Basic application load and public pages", () => {
  test.beforeEach(async ({ page }) => {
    await clearAWalletDB(page);
  });

  test("index page loads and redirects an empty browser to wallet creation", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(new-wallet)?$/);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator(".p-button").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("new wallet form does not create a wallet from empty input", async ({
    page,
  }) => {
    await page.goto("/new-wallet");
    await expect(page.locator("#newwallet-name")).toBeVisible();
    await page.locator("#new_wallet_button_create").click({ force: true });
    await expect(page).toHaveURL(/\/new-wallet/);
    await expect(page.locator("#newwallet-name")).toBeVisible();
  });

  test("import wallet page renders its form", async ({
    page,
  }) => {
    await page.goto("/import-wallet");
    await expect(page).toHaveURL(/\/import-wallet/);
    await expect(page.locator("#newwallet-name")).toBeVisible();
  });

  test("FAQ page renders without a wallet", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("[id^='faq-']").first()).toBeAttached();
  });

  test("privacy policy page renders without a wallet", async ({ page }) => {
    await page.goto("/privacy-policy");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("changelog page renders the project history", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("body")).toContainText("2021");
  });
});
