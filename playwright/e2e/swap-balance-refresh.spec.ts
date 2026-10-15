import { test, expect } from "@playwright/test";
import { setupFreshWallet } from "../support/wallet";

const USDC = 31566704;

// Regression test for #204: the Swap page kept the pre-swap balance. Here the
// balance changes on chain while the page is open; the page must pick it up on
// its own within 30 seconds, without a reload.
test("the swap page refreshes the balance every 30 seconds", async ({
  page,
}) => {
  test.setTimeout(120000);
  let usdcBase = 10_000_000;
  let accountReads = 0;
  await page.route(/\/v2\/applications\/\d+/, (route) => route.abort());
  await page.route(/\/v2\/accounts\/[A-Z2-7]{58}/, (route) => {
    accountReads++;
    const addr = new URL(route.request().url()).pathname.split(
      "/v2/accounts/",
    )[1];
    return route.fulfill({
      json: {
        "current-round": 100,
        account: {
          address: addr,
          amount: 5_000_000,
          "amount-without-pending-rewards": 5_000_000,
          "min-balance": 200_000,
          "pending-rewards": 0,
          rewards: 0,
          round: 100,
          status: "Offline",
          "total-apps-opted-in": 0,
          "total-assets-opted-in": 1,
          "total-created-apps": 0,
          "total-created-assets": 0,
          assets: [{ "asset-id": USDC, amount: usdcBase, "is-frozen": false }],
        },
      },
    });
  });

  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await page.evaluate((id) => {
    localStorage.setItem(
      `Asset-${id}`,
      JSON.stringify({
        assetId: String(id),
        name: "USDC",
        label: "USDC",
        unitName: "USDC",
        decimals: 6,
        type: "ASA",
      }),
    );
  }, USDC);

  await page.evaluate(
    ([to]) => {
      history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [`/swap/${addr}/0/${USDC}`],
  );
  const from = page.locator("#swap_asset_from");
  await expect(from).toContainText("Balance: 10", { timeout: 30000 });

  // The swap spent 70%: the chain now shows 3 USDC, the page does not know yet.
  usdcBase = 3_000_000;
  const readsBefore = accountReads;
  await expect(from).not.toContainText("Balance: 3");

  // Within one period the page re-reads the account and shows the new balance.
  await expect(from).toContainText("Balance: 3", { timeout: 40000 });
  expect(accountReads).toBeGreaterThan(readsBefore);
});
