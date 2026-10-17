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

  test("a full origin eviction (IndexedDB and localStorage gone) is still reported via the flag cookie", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Evicted Wallet 2");
    await page.getByText("Wallet", { exact: true }).click({ force: true });
    await page.getByText("Logout", { exact: true }).click({ force: true });
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();

    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          localStorage.clear();
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

  test("an unreadable database is reported, not mistaken for an empty wallet list", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      indexedDB.open = () => {
        throw new Error("IndexedDB unavailable");
      };
    });
    await page.goto("/");
    await expect(page.locator("#storage-notice")).toBeVisible();
    await expect(page).not.toHaveURL(/new-wallet/);
  });

  test("a wallet the user destroyed on purpose is not reported as lost", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Destroyed Wallet");
    await page.getByRole("menuitem", { name: /Algorand Mainnet/ }).click();
    await page
      .locator(".p-menubar-item-label:visible", { hasText: /^Settings$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/settings/);
    await page.getByRole("button", { name: "Create backup" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete wallet" }).click();
    await expect(page.locator("#new_wallet_button_open, #new_wallet_button_create").first()).toBeVisible();

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === "awallet_had_wallet")).toBe(false);
    await page.goto("/");
    await expect(page).toHaveURL(/new-wallet/);
    await expect(page.locator("#storage-notice")).toHaveCount(0);
  });

  test("a first-time visitor is still sent to create a wallet, without a warning", async ({
    page,
  }) => {
    await page.goto("/");
    await page.context().clearCookies();
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
