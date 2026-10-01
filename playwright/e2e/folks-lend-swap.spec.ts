import { test, expect, type Page } from "@playwright/test";
import algosdk from "algosdk";
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

  // ...and so is the missing ALGO for the 0.1 ALGO opt-in reservation.
  await expect(card.getByText("Not enough ALGO")).toBeVisible();

  // Negative case: amount above the (zero) USDC balance.
  await card.locator("#folks-lend-amount").fill("5");
  await card.locator("#folks-lend-amount").press("Tab");
  await expect(page.getByTestId("folks-lend-submit")).toBeDisabled();

  // Switching direction resets the form and the submit stays disabled.
  await card.getByText("Withdraw fUSDC → USDC").click();
  await expect(page.getByTestId("folks-lend-submit")).toBeDisabled();
  await expect(card.locator("#folks-lend-amount")).toHaveValue("0");
});

test("selecting USDC as the source offers the fUSDC opt-in, but not for other assets", async ({
  page,
}) => {
  await page.route(/\/v2\/applications\/971372237/, (route) => route.abort());
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];

  // In-app route change (history + popstate) - a page.goto would lock the wallet.
  const openSwap = async (path: string) => {
    await page.evaluate((to) => {
      history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, path);
  };

  // USDC (31566704) as source asset, fUSDC not held yet.
  await openSwap(`/swap/${addr}/0/31566704`);
  const optIn = page.getByTestId("folks-fusdc-optin");
  await expect(optIn).toBeVisible({ timeout: 30000 });
  await expect(optIn.getByRole("button", { name: "Opt in to fUSDC" })).toBeVisible();
  // A brand new account has no ALGO for the 0.1 ALGO reservation: the button
  // is blocked and says why instead of failing on-chain.
  await expect(optIn.getByText("Not enough ALGO")).toBeVisible();
  await expect(page.getByTestId("folks-fusdc-optin-button")).toBeDisabled();

  // Any other source asset (ALGO), chosen in the page's own selector, shows
  // no opt-in prompt.
  await page.locator("#swap_asset_from").click();
  await page
    .locator(".p-select-overlay .p-select-option")
    .filter({ hasText: "Native token" })
    .first()
    .click();
  await expect(page.getByTestId("folks-lend")).toBeVisible();
  await expect(page.getByTestId("folks-fusdc-optin")).toHaveCount(0);
});

const USDC = 31566704;
const FUSDC = 971384592;

interface ChainMockOptions {
  /** algod rejects the submitted transaction. */
  rejectSend?: boolean;
  /** the indexer fails once the opt-in went through. */
  failRefreshAfterOptIn?: boolean;
}

/**
 * Mocked chain: the account holds ALGO + USDC and fUSDC only after the opt-in.
 * Installed before the wallet exists so that no real mainnet lookup can land
 * later and overwrite the mocked holdings.
 */
async function mockFolksChain(page: Page, opts: ChainMockOptions = {}) {
  const state = { optedIn: false, submitted: null as Buffer | null };
  await page.route(/\/v2\/applications\/971372237/, (route) => route.abort());
  await page.route(/\/v2\/accounts\/[A-Z2-7]{58}/, (route) => {
    if (opts.failRefreshAfterOptIn && state.optedIn) {
      return route.fulfill({ status: 500, body: "indexer down" });
    }
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
          "total-assets-opted-in": state.optedIn ? 2 : 1,
          "total-created-apps": 0,
          "total-created-assets": 0,
          assets: [
            { "asset-id": USDC, amount: 10_000_000, "is-frozen": false },
            ...(state.optedIn
              ? [{ "asset-id": FUSDC, amount: 0, "is-frozen": false }]
              : []),
          ],
        },
      },
    });
  });
  await page.route(/\/v2\/transactions\/params/, (route) =>
    route.fulfill({
      json: {
        "consensus-version": "future",
        fee: 0,
        "genesis-hash": Buffer.alloc(32).toString("base64"),
        "genesis-id": "mainnet-v1.0",
        "last-round": 100,
        "min-fee": 1000,
      },
    }),
  );
  await page.route(/\/v2\/transactions$/, (route) => {
    if (opts.rejectSend) {
      return route.fulfill({
        status: 400,
        json: { message: "TransactionPool.Remember: transaction rejected" },
      });
    }
    state.submitted = route.request().postDataBuffer();
    state.optedIn = true;
    return route.fulfill({ json: { txId: "OPTINTXID" } });
  });
  await page.route(/\/v2\/status$/, (route) =>
    route.fulfill({
      json: {
        "catchup-time": 0,
        "last-round": 100,
        "last-version": "future",
        "next-version": "future",
        "next-version-round": 101,
        "next-version-supported": true,
        "stopped-at-unsupported-round": false,
        "time-since-last-round": 0,
      },
    }),
  );
  await page.route(/\/v2\/transactions\/pending\//, (route) =>
    route.fulfill({
      contentType: "application/msgpack",
      body: Buffer.from(
        algosdk.msgpackRawEncode({
          "confirmed-round": 101,
          "pool-error": "",
          // echo the signed transaction the wallet submitted
          txn: algosdk.msgpackRawDecode(state.submitted ?? Buffer.alloc(0)),
        }),
      ),
    }),
  );
  return state;
}

/** Fresh wallet, known asset metadata, then the Swap page with USDC as source. */
async function openSwapWithUsdc(page: Page) {
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  // The store reads its localStorage asset cache first.
  await page.evaluate(
    ([usdc, fusdc]) => {
      const put = (id: number, name: string) =>
        localStorage.setItem(
          `Asset-${id}`,
          JSON.stringify({
            assetId: String(id),
            name,
            label: name,
            unitName: name,
            decimals: 6,
            type: "ASA",
          }),
        );
      put(usdc, "USDC");
      put(fusdc, "fUSDC");
    },
    [USDC, FUSDC],
  );
  // In-app route change (history + popstate) - a page.goto would lock the wallet.
  await page.evaluate((to) => {
    history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, `/swap/${addr}/0/${USDC}`);
  const button = page.getByTestId("folks-fusdc-optin-button");
  await expect(button).toBeVisible({ timeout: 30000 });
  await expect(button).toBeEnabled();
  return button;
}

test("after the fUSDC opt-in is confirmed the balance is reloaded and fUSDC becomes the destination", async ({
  page,
}) => {
  test.setTimeout(180000);
  const chain = await mockFolksChain(page);
  const button = await openSwapWithUsdc(page);

  await button.click();

  // Confirmed + reloaded: the prompt is gone and fUSDC is the destination.
  await expect(page.getByTestId("folks-fusdc-optin")).toHaveCount(0, {
    timeout: 30000,
  });
  await expect(page.locator("#swap_asset_to")).toContainText("fUSDC");
  expect(chain.submitted).not.toBeNull();
});

test("a rejected opt-in keeps the prompt and does not change the destination", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { rejectSend: true });
  const button = await openSwapWithUsdc(page);

  await button.click();

  await expect(page.locator(".p-toast-message-error").first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("folks-fusdc-optin")).toBeVisible();
  await expect(page.locator("#swap_asset_to")).not.toContainText("fUSDC");
  // The user can try again.
  await expect(button).toBeEnabled();
});

test("a failed refresh after a confirmed opt-in is not reported as a failed opt-in", async ({
  page,
}) => {
  test.setTimeout(180000);
  const chain = await mockFolksChain(page, { failRefreshAfterOptIn: true });
  const button = await openSwapWithUsdc(page);

  await button.click();

  await expect(page.locator(".p-toast-message-success").first()).toBeVisible({
    timeout: 30000,
  });
  expect(chain.submitted).not.toBeNull();
  // No error toast, and no stale destination selection (fUSDC is not in the
  // asset list until the holdings reload).
  await expect(page.locator(".p-toast-message-error")).toHaveCount(0);
  await expect(page.locator("#swap_asset_to")).not.toContainText("fUSDC");
});
