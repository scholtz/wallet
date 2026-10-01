import { test, expect } from "@playwright/test";
import { setupFreshWallet } from "../support/wallet";

test.describe("UI preferences", () => {
  test("theme toggle switches between light and dark", async ({ page }) => {
    await setupFreshWallet(page);
    const html = page.locator("html");
    const isDark = () => html.evaluate((el) => el.classList.contains("p-dark"));
    const before = await isDark();
    await page.locator(".theme-toggle").click();
    await expect.poll(isDark).toBe(!before);
    await page.locator(".theme-toggle").click();
    await expect.poll(isDark).toBe(before);
  });

  test("language can be switched on the login screen", async ({ page }) => {
    await setupFreshWallet(page);
    await page.reload(); // locks the wallet -> login screen with flags
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();
    const openLabel = await page.locator("#new_wallet_button_open").innerText();
    await page.locator(".language-footer a").nth(1).click();
    await expect(page.locator("#new_wallet_button_open")).not.toHaveText(
      openLabel
    );
  });

  test("settings page opens from the navbar", async ({ page }) => {
    await setupFreshWallet(page);
    // Settings lives in the network submenu (top-level label = network name).
    await page.getByRole("menuitem", { name: /Algorand Mainnet/ }).click();
    await page
      .locator(".p-menubar-item-label:visible", { hasText: /^Settings$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("#algodHost")).toBeVisible();
  });
});
