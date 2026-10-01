import { test, expect } from "@playwright/test";
import { DEFAULT_WALLET_PASSWORD, setupFreshWallet } from "../support/wallet";

test.describe("Wallet lock / unlock", () => {
  test("logout, reject a wrong password, then reopen with the right one", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Persisted Wallet");

    await page.getByText("Wallet", { exact: true }).click({ force: true });
    await page.getByText("Logout", { exact: true }).click({ force: true });

    // Logout itself locks the wallet: the open-wallet form appears without
    // any reload.
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();

    // The wallet is persisted in IndexedDB, so a reload still offers it.
    await page.goto("/");
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();
    await expect(page.locator("#wallet-select")).toBeVisible();

    // Wrong password: stays locked.
    await page.locator("#wallet-pass").fill("wrong-password");
    await page.locator("#new_wallet_button_open").click();
    await expect(page.locator(".p-toast-message")).toBeVisible();
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();
    await expect(page).not.toHaveURL(/\/account\//);

    // Correct password: wallet opens.
    await page.locator("#wallet-pass").fill(DEFAULT_WALLET_PASSWORD);
    await page.locator("#new_wallet_button_open").click();
    await page.waitForURL(/\/account\/|\/accounts/, { timeout: 30000 });
    await expect(page.locator("#new_wallet_button_open")).toHaveCount(0);
  });

  test("a page reload locks an unlocked wallet", async ({ page }) => {
    await setupFreshWallet(page);
    await page.reload();
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();
  });
});
