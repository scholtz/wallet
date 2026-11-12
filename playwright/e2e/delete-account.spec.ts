import { test, expect } from "@playwright/test";
import { DEFAULT_WALLET_PASSWORD, setupFreshWallet } from "../support/wallet";

// AW-2026-118/-119: deleting an account that holds its own key needs the wallet password, warns
// about a missing backup, and deleting the last account is really persisted.
test.describe("Delete account", () => {
  test("the last account is gone after a lock and unlock, and a wrong password deletes nothing", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Delete Wallet");
    const account = page.url().split("/account/")[1];

    await page.getByRole("button", { name: "Delete account", exact: true }).click();
    // The auto-created account was never backed up: the dialog says so, and the button stays
    // disabled until the wallet password is typed.
    await expect(page.getByTestId("delete-not-backed-up")).toBeVisible();
    const confirm = page.getByRole("button", { name: "Delete this account", exact: true });
    await expect(confirm).toBeDisabled();

    // Wrong password: nothing is deleted.
    await page.locator("#delete_account_password").fill("not-the-password");
    await confirm.click();
    await expect(page.locator(".p-toast-message")).toContainText("Wrong password", {
      timeout: 30000,
    });
    await expect(page).toHaveURL(`/account/${account}`);

    // The dialog stays open after a failure; the right password deletes the (last) account.
    await page.locator("#delete_account_password").fill(DEFAULT_WALLET_PASSWORD);
    await confirm.click();
    await expect(page).toHaveURL(/\/accounts/);

    // It was persisted, not only removed from memory: after a reload (which locks the wallet)
    // and an unlock the account does not come back.
    await page.reload();
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();
    await page.locator("#wallet-pass").fill(DEFAULT_WALLET_PASSWORD);
    await page.locator("#new_wallet_button_open").click();
    await page.waitForURL(/\/account\/|\/accounts/, { timeout: 30000 });
    await expect(page.getByRole("cell", { name: account })).toHaveCount(0);
    await expect(page).not.toHaveURL(new RegExp(`/account/${account}`));
  });
});
