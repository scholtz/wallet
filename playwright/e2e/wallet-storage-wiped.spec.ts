import { test, expect } from "@playwright/test";
import { setupFreshWallet } from "../support/wallet";

test.describe("Wallet storage wiped by the browser", () => {
  test("a wallet that vanished is reported instead of silently showing a blank new wallet", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Evicted Wallet");

    await page.getByText("Wallet", { exact: true }).click({ force: true });
    await page.getByText("Logout", { exact: true }).click({ force: true });
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();

    // Simulate the browser evicting IndexedDB while localStorage (lastUsedWallet) survives.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase("AWallet");
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
          setTimeout(() => resolve(), 2000);
        })
    );

    await page.goto("/");
    await expect(page.locator("#storage-notice")).toBeVisible();
    await expect(page).not.toHaveURL(/new-wallet/);
  });

  test("a first-time visitor is still sent to create a wallet, without a warning", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("lastUsedWallet"));
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase("AWallet");
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
          setTimeout(() => resolve(), 1000);
        })
    );
    await page.goto("/");
    await expect(page).toHaveURL(/new-wallet/);
    await expect(page.locator("#storage-notice")).toHaveCount(0);
  });
});
