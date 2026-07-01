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
