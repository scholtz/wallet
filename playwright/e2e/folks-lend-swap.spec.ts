import { test, expect } from "@playwright/test";
import { setupFreshWallet } from "../support/wallet";

test("swap page offers the Folks USDC <-> fUSDC card and blocks an unfunded deposit", async ({
  page,
}) => {
  // Keep the test independent of the live Folks pool: the pool application
  // state request fails, which also covers the "rate unavailable" path.
  await page.route(/\/v2\/applications\/971372237/, (route) => route.abort());

  await setupFreshWallet(page);

  // In-app navigation only - a reload would lock the wallet.
  await page.locator(".p-tabmenu").getByText("Actions", { exact: true }).click({ force: true });
  await page.locator("a[href^='/swap/']:visible").first().click();
  await expect(page).toHaveURL(/\/swap\//);

  const card = page.getByTestId("folks-lend");
  await expect(card).toBeVisible();
  await expect(card.getByText("Deposit USDC → fUSDC")).toBeVisible();
  await expect(page.getByTestId("folks-lend-submit")).toBeDisabled();
  await expect(
    card.getByText("Unable to load the Folks Finance pool rate"),
  ).toBeVisible({ timeout: 30000 });

  // A brand new account holds no fUSDC, so the opt-in is announced.
  await expect(
    card.getByText("opt in to fUSDC in the same transaction group"),
  ).toBeVisible();

  // Negative case: amount above the (zero) USDC balance.
  await card.locator("#folks-lend-amount").fill("5");
  await card.locator("#folks-lend-amount").press("Tab");
  await expect(page.getByTestId("folks-lend-submit")).toBeDisabled();

  // Switching direction resets the form and the submit stays disabled.
  await card.getByText("Withdraw fUSDC → USDC").click();
  await expect(page.getByTestId("folks-lend-submit")).toBeDisabled();
  await expect(card.locator("#folks-lend-amount")).toHaveValue("0");
});
