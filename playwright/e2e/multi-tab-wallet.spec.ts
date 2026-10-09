// Two browser tabs sharing one wallet (AW-2026-059 lost update, AW-2026-060 stale password) and
// password policy (AW-2026-066). Tabs of one context share IndexedDB but keep separate sessions.
import { test, expect, type Page } from "@playwright/test";
import {
  DEFAULT_WALLET_PASSWORD,
  chooseNewAccountMenuItem,
  clearAWalletDB,
  setupFreshWallet,
} from "../support/wallet";

async function unlock(page: Page, password = DEFAULT_WALLET_PASSWORD) {
  await page.goto("/");
  await expect(page.locator("#new_wallet_button_open")).toBeVisible();
  await page.locator("#wallet-pass").fill(password);
  await page.locator("#new_wallet_button_open").click();
  await page.waitForURL(/\/account\/|\/accounts/, { timeout: 30000 });
  await expect(page.locator("#new_wallet_button_open")).toHaveCount(0);
}

async function createEd25519Account(page: Page, name: string) {
  await chooseNewAccountMenuItem(page, "Create basic account");
  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  await page.locator("#name").fill(name);
  await page.locator("#skip_challange").click();
}

async function openAccountList(page: Page) {
  await page.getByText("Wallet", { exact: true }).click({ force: true });
  await page.getByText("List my accounts", { exact: true }).click({ force: true });
  await expect(page).toHaveURL(/\/accounts$/);
}

async function openSettings(page: Page) {
  // Settings lives in the network (cog) submenu of the navbar.
  await page.getByRole("menuitem", { name: /Algorand Mainnet|Mainnet/ }).first().click();
  await page
    .locator(".p-menubar-item-label:visible", { hasText: /^Settings$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.locator("#passw1")).toBeVisible();
}

async function submitPasswordChange(
  page: Page,
  oldPass: string,
  newPass: string,
) {
  await page.locator("#passw1").fill(oldPass);
  await page.locator("#passw2").fill(newPass);
  await page.locator("#passw3").fill(newPass);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.locator(".p-toast-message").first()).toBeVisible();
}

test.describe("Two tabs, one wallet", () => {
  test("an account created in one tab survives the other tab saving (AW-2026-059)", async ({
    page,
    context,
  }) => {
    await setupFreshWallet(page, "Shared Wallet");
    const tabB = await context.newPage();
    await unlock(tabB);

    // Tab A creates an account; tab B has not seen it yet.
    await createEd25519Account(page, "Account From Tab A");
    await page.waitForURL(/\/account\//, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Account From Tab A");
    // Tab B creates its own account, which saves the wallet from B's stale copy.
    await createEd25519Account(tabB, "Account From Tab B");
    await tabB.waitForURL(/\/account\//, { timeout: 15000 });
    await expect(tabB.locator("h1")).toContainText("Account From Tab B");

    // A fresh session sees both accounts: B's save did not erase A's account.
    const tabC = await context.newPage();
    await unlock(tabC);
    await openAccountList(tabC);
    await expect(tabC.getByText("Account From Tab A").first()).toBeVisible();
    await expect(tabC.getByText("Account From Tab B").first()).toBeVisible();
  });

  test("a stale tab cannot revert a password change (AW-2026-060)", async ({
    page,
    context,
  }) => {
    const NEW_PASSWORD = "BrandNewPass456";
    await setupFreshWallet(page, "Rotating Wallet");
    const tabB = await context.newPage();
    await unlock(tabB);

    // Tab A changes the password in Settings.
    await openSettings(page);
    await submitPasswordChange(page, DEFAULT_WALLET_PASSWORD, NEW_PASSWORD);

    // Tab B still holds the old password; its next save is refused with an error. The session
    // stays open so a key created there is not thrown away.
    await createEd25519Account(tabB, "Stale Tab Account");
    await expect(
      tabB.locator(".p-toast-message", { hasText: "changed in another window" }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(tabB.locator("#new_wallet_button_open")).toHaveCount(0);

    // The new password opens the wallet, the old one no longer does.
    const fresh = await context.newPage();
    await fresh.goto("/");
    await fresh.locator("#wallet-pass").fill(DEFAULT_WALLET_PASSWORD);
    await fresh.locator("#new_wallet_button_open").click();
    await expect(fresh.locator(".p-toast-message").first()).toBeVisible();
    await expect(fresh.locator("#new_wallet_button_open")).toBeVisible();
    await fresh.locator("#wallet-pass").fill(NEW_PASSWORD);
    await fresh.locator("#new_wallet_button_open").click();
    await fresh.waitForURL(/\/account\/|\/accounts/, { timeout: 30000 });
  });
});

test.describe("Password policy (AW-2026-066)", () => {
  for (const [label, password] of [
    ["an empty password", ""],
    ["a too short password", "abc123"],
  ] as const) {
    test(`creating a wallet with ${label} is refused`, async ({ page }) => {
      await clearAWalletDB(page);
      await page.goto("/new-wallet");
      await expect(page.locator("#newwallet-name")).toBeVisible();
      await page.locator("#newwallet-name").fill("Weak Wallet");
      await page.locator("#newwallet-pass").fill(password);
      await page.locator("#newwallet-name").click();
      await page.locator("#new_wallet_button_create").click({ force: true });
      await expect(page.locator(".p-toast-message").first()).toBeVisible();
      await expect(page).toHaveURL(/\/new-wallet/);
    });
  }

  test("changing to a too short password is refused and the old one keeps working", async ({
    page,
  }) => {
    await setupFreshWallet(page, "Policy Wallet");
    await openSettings(page);
    await submitPasswordChange(page, DEFAULT_WALLET_PASSWORD, "short");

    await page.getByText("Wallet", { exact: true }).click({ force: true });
    await page.getByText("Logout", { exact: true }).click({ force: true });
    await page.locator("#wallet-pass").fill(DEFAULT_WALLET_PASSWORD);
    await page.locator("#new_wallet_button_open").click();
    await page.waitForURL(/\/account\/|\/accounts/, { timeout: 30000 });
  });
});
