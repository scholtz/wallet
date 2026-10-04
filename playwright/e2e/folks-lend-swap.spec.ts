import { test, expect, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { setupFreshWallet } from "../support/wallet";

test("USDC <-> fUSDC replaces the quote form with the Folks lending panel; the assets choose the direction", async ({
  page,
}) => {
  test.setTimeout(180000);
  // The account already holds USDC and fUSDC. The pool state request fails,
  // which also covers the "rate unavailable" path (no live pool needed).
  await mockFolksChain(page, { startOptedIn: true });
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);

  // Source USDC, destination fUSDC (route params: toAsset / fromAsset).
  await openSwap(page, `/swap/${addr}/${FUSDC}/${USDC}`);
  const card = page.getByTestId("folks-lend");
  await expect(card).toBeVisible({ timeout: 30000 });
  const submit = page.getByTestId("folks-lend-submit");
  await expect(submit).toHaveText(/Deposit/);
  await expect(submit).toBeDisabled();
  await expect(
    card.getByText("Unable to load the Folks Finance pool rate"),
  ).toBeVisible({ timeout: 30000 });

  // The routed-swap quote form is gone, the main form stays.
  await expect(page.getByRole("button", { name: "Get quote" })).toHaveCount(0);
  await expect(page.locator("#swap_asset_from")).toBeVisible();
  await expect(page.locator("#payamount")).toBeVisible();
  // No separate direction selector / amount field inside the panel.
  await expect(card.locator("#folks-lend-amount")).toHaveCount(0);
  await expect(page.getByTestId("folks-lend-direction")).toHaveCount(0);

  // Negative case: more than the 10 USDC held. The main amount field clamps
  // to the balance, and without a pool rate the action stays disabled.
  await page.locator("#payamount").fill("50");
  await page.locator("#payamount").press("Tab");
  await expect(page.locator("#payamount")).toHaveValue("10");
  await expect(submit).toBeDisabled();

  // The main form's exchange button flips the direction to a withdrawal.
  await page.getByRole("button", { name: /Exchange source and destination/ }).click();
  await expect(submit).toHaveText(/Withdraw/);
  await expect(card).toBeVisible();

  // Any other pair is a normal swap again: quote form back, panel gone.
  await page.locator("#swap_asset_to").click();
  await page
    .locator(".p-select-overlay .p-select-option")
    .filter({ hasText: "Native token" })
    .first()
    .click();
  await expect(page.getByRole("button", { name: "Get quote" })).toBeVisible();
  await expect(page.getByTestId("folks-lend")).toHaveCount(0);
});

const USDC = 31566704;
const FUSDC = 971384592;
// An asset the mocked account is opted in to but holds none of.
const ZERO_BALANCE_ASSET = 312769;

interface ChainMockOptions {
  /** algod rejects the submitted transaction. */
  rejectSend?: boolean;
  /** the indexer fails once the opt-in went through. */
  failRefreshAfterOptIn?: boolean;
  /** the account already holds fUSDC. */
  startOptedIn?: boolean;
  /** ALGO balance of the mocked account in microAlgo (default 5 ALGO). */
  algoMicro?: number;
  /** USDC balance of the mocked account in base units (default 10 USDC). */
  usdcBase?: number;
}

/**
 * Mocked chain: the account holds ALGO + USDC and fUSDC only after the opt-in.
 * Installed before the wallet exists so that no real mainnet lookup can land
 * later and overwrite the mocked holdings.
 */
async function mockFolksChain(page: Page, opts: ChainMockOptions = {}) {
  const state = {
    optedIn: !!opts.startOptedIn,
    submitted: null as Buffer | null,
  };
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
          amount: opts.algoMicro ?? 5_000_000,
          "amount-without-pending-rewards": opts.algoMicro ?? 5_000_000,
          "min-balance": 200_000,
          "pending-rewards": 0,
          rewards: 0,
          round: 100,
          status: "Offline",
          "total-apps-opted-in": 0,
          "total-assets-opted-in": state.optedIn ? 3 : 2,
          "total-created-apps": 0,
          "total-created-assets": 0,
          assets: [
            {
              "asset-id": USDC,
              amount: opts.usdcBase ?? 10_000_000,
              "is-frozen": false,
            },
            { "asset-id": ZERO_BALANCE_ASSET, amount: 0, "is-frozen": false },
            ...(state.optedIn
              ? [{ "asset-id": FUSDC, amount: 5_000_000, "is-frozen": false }]
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
        "genesis-hash": "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
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

/** The store reads its localStorage asset cache first. */
async function seedAssetCache(page: Page) {
  await page.evaluate(
    ([usdc, fusdc, zero]) => {
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
      put(zero, "USDt");
    },
    [USDC, FUSDC, ZERO_BALANCE_ASSET],
  );
}

/** In-app route change (history + popstate) - a page.goto would lock the wallet. */
async function openSwap(page: Page, path: string) {
  await page.evaluate((to) => {
    history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

/** Fresh wallet, known asset metadata, then the Swap page with USDC as source. */
async function openSwapWithUsdc(page: Page) {
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);
  await openSwap(page, `/swap/${addr}/0/${USDC}`);
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
  // USDC -> fUSDC is now selected, so the Folks lending panel is shown.
  await expect(page.getByTestId("folks-lend")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get quote" })).toHaveCount(0);
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
  // No error toast, the prompt is gone (it must not be submittable twice),
  // and no stale destination selection (fUSDC is not in the asset list until
  // the holdings reload).
  await expect(page.locator(".p-toast-message-error")).toHaveCount(0);
  await expect(page.getByTestId("folks-fusdc-optin")).toHaveCount(0);
  await expect(page.locator("#swap_asset_to")).not.toContainText("fUSDC");
});

test("the source list only offers assets with a balance, the destination list offers all", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { startOptedIn: true });
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);
  await openSwap(page, `/swap/${addr}/0/${USDC}`);
  await expect(page.locator("#swap_asset_from")).toContainText("USDC", {
    timeout: 30000,
  });

  const options = page.locator(".p-select-overlay .p-select-option");
  // Source: held assets only - the 0-balance USDt is hidden.
  await page.locator("#swap_asset_from").click();
  await expect(options.filter({ hasText: "USDC" }).first()).toBeVisible();
  await expect(options.filter({ hasText: "fUSDC" }).first()).toBeVisible();
  await expect(options.filter({ hasText: "USDt" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Destination: every opted-in asset, including the 0-balance ones.
  await page.locator("#swap_asset_to").click();
  await expect(options.filter({ hasText: "USDt" }).first()).toBeVisible();
  await expect(options.filter({ hasText: "fUSDC" }).first()).toBeVisible();
});

test("selecting USDC offers a 'Swap to fUSDC' button that selects fUSDC and shows the lending panel", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { startOptedIn: true });
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);
  // USDC is the source, the destination is still ALGO.
  await openSwap(page, `/swap/${addr}/0/${USDC}`);

  const button = page.getByTestId("folks-swap-to-fusdc-button");
  await expect(button).toBeVisible({ timeout: 30000 });
  await expect(button).toHaveText(/Swap to fUSDC/);
  // The normal quote form is shown until the pair is selected.
  await expect(page.getByRole("button", { name: "Get quote" })).toBeVisible();

  await button.click();

  await expect(page.locator("#swap_asset_to")).toContainText("fUSDC");
  await expect(page.getByTestId("folks-lend")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get quote" })).toHaveCount(0);
  // Already selected: the shortcut is gone.
  await expect(button).toHaveCount(0);
});

test("the 'Swap to fUSDC' button is not offered for other source assets", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { startOptedIn: true });
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);
  // ALGO as the source.
  await openSwap(page, `/swap/${addr}/${USDC}/0`);
  await expect(page.locator("#swap_asset_from")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("folks-swap-to-fusdc-button")).toHaveCount(0);
});

test("selecting USDC as the source offers the fUSDC opt-in, but not for other assets", async ({
  page,
}) => {
  test.setTimeout(180000);
  // Holds USDC but no fUSDC, and only 0.15 ALGO: not enough for the 0.1 ALGO
  // reservation of one more opt-in on top of the minimum balance.
  await mockFolksChain(page, { algoMicro: 150_000 });
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);

  // USDC as the source asset, fUSDC not held yet.
  await openSwap(page, `/swap/${addr}/0/${USDC}`);
  const optIn = page.getByTestId("folks-fusdc-optin");
  await expect(optIn).toBeVisible({ timeout: 30000 });
  await expect(
    optIn.getByRole("button", { name: "Opt in to fUSDC" }),
  ).toBeVisible();
  // The button is blocked and says why instead of failing on-chain.
  await expect(optIn.getByText("Not enough ALGO")).toBeVisible();
  await expect(page.getByTestId("folks-fusdc-optin-button")).toBeDisabled();
  // No "Swap to fUSDC" shortcut yet: fUSDC is not held.
  await expect(page.getByTestId("folks-swap-to-fusdc-button")).toHaveCount(0);

  // Any other source asset (ALGO), chosen in the page's own selector, shows
  // no opt-in prompt.
  await page.locator("#swap_asset_from").click();
  await page
    .locator(".p-select-overlay .p-select-option")
    .filter({ hasText: "Native token" })
    .first()
    .click();
  // ALGO is a normal swap source: no opt-in prompt, no lending panel.
  await expect(page.getByRole("button", { name: "Get quote" })).toBeVisible();
  await expect(page.getByTestId("folks-lend")).toHaveCount(0);
  await expect(page.getByTestId("folks-fusdc-optin")).toHaveCount(0);
});

test("the account overview suggests converting held USDC to fUSDC and opens the swap preselected", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { startOptedIn: true });
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);

  const hint = page.getByTestId("folks-yield-hint");
  await expect(hint).toBeVisible({ timeout: 30000 });
  await expect(hint).toContainText("10 USDC");

  await page.getByTestId("folks-yield-hint-button").click();

  // Navigated in-app to the swap page with USDC -> fUSDC preselected.
  await expect(page).toHaveURL(`/swap/${addr}/${FUSDC}/${USDC}`);
  await expect(page.locator("#swap_asset_from")).toContainText("USDC", {
    timeout: 30000,
  });
  await expect(page.locator("#swap_asset_to")).toContainText("fUSDC");
  const panel = page.getByTestId("folks-lend");
  await expect(panel).toBeVisible();
  await expect(page.getByRole("button", { name: "Get quote" })).toHaveCount(0);
  // The action sits in the second column, like the regular "Get quote" row.
  await expect(
    panel.locator(".field.grid .md\\:col-10").getByTestId("folks-lend-submit"),
  ).toHaveCount(1);
});

test("the overview hint for an account that has not opted in to fUSDC preselects USDC and offers the opt-in", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page); // holds USDC, fUSDC not held
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await seedAssetCache(page);

  await expect(page.getByTestId("folks-yield-hint")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("folks-yield-hint-button").click();

  // fUSDC cannot be chosen before the account holds it, so only the source is
  // preselected and the opt-in button is offered (it then selects fUSDC).
  await expect(page).toHaveURL(`/swap/${addr}/0/${USDC}`);
  await expect(page.locator("#swap_asset_from")).toContainText("USDC", {
    timeout: 30000,
  });
  await expect(page.getByTestId("folks-fusdc-optin-button")).toBeVisible();
  await expect(page.getByTestId("folks-fusdc-optin-button")).toBeEnabled();
  await expect(page.locator("#swap_asset_to")).not.toContainText("fUSDC");
});

test("the overview shows no yield hint when a loaded account holds no USDC", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { usdcBase: 0 });
  await setupFreshWallet(page);
  // The account details are loaded (5 ALGO from the mocked indexer) ...
  await expect(page.getByText("5.000000 Algo")).toBeVisible({ timeout: 30000 });
  // ... and there is nothing to convert.
  await expect(page.getByTestId("folks-yield-hint")).toHaveCount(0);
});

test("the overview shows no yield hint for a dust USDC balance", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { usdcBase: 4_000 }); // 0.004 USDC
  await setupFreshWallet(page);
  await expect(page.getByText("5.000000 Algo")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("folks-yield-hint")).toHaveCount(0);
});

test("the overview hint does not understate balances whose float product is off by a cent", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { usdcBase: 290_000, startOptedIn: true }); // 0.29 USDC
  await setupFreshWallet(page);
  await expect(page.getByTestId("folks-yield-hint")).toContainText(
    "0.29 USDC",
    { timeout: 30000 },
  );
});

test("the overview hint shows the USDC balance floored to cents", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mockFolksChain(page, { usdcBase: 10_999_000, startOptedIn: true });
  await setupFreshWallet(page);
  await expect(page.getByTestId("folks-yield-hint")).toContainText(
    "10.99 USDC",
    { timeout: 30000 },
  );
});
