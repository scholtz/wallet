import { test, expect, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { chooseNewAccountMenuItem, setupFreshWallet } from "../support/wallet";

// The swap page cannot sign for a multisig account itself: Execute hands the
// routed group to /signAll (like scheduled payments do), the signatures are
// collected there through /sign, the group is sent and "Return to swap" leads
// back to the swap page. All network access is mocked.

const USDC = 31566704;
const GENESIS_HASH = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
};

interface ChainState {
  /** Raw body of the group the wallet submitted to algod. */
  submitted: Buffer | null;
  /** Base64 unsigned transactions the mocked Deflex route answers with. */
  deflexTxns: string[];
}

/** Splits the back-to-back msgpack objects of a submitted group (no length prefix exists). */
function splitSigned(body: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  while (start < body.length) {
    let end = start + 1;
    for (; end <= body.length; end++) {
      try {
        algosdk.msgpackRawDecode(body.subarray(start, end));
        break;
      } catch {
        // not a complete object yet
      }
    }
    if (end > body.length) throw new Error("submitted body is not msgpack");
    parts.push(body.subarray(start, end));
    start = end;
  }
  return parts;
}

interface StoreHost {
  __vue_app__?: {
    config: {
      globalProperties: {
        $store: {
          state: {
            wallet: {
              privateAccounts: {
                addr: string;
                params?: unknown;
                data?: Record<string, Record<string, unknown>>;
              }[];
            };
          };
        };
      };
    };
  };
}

/** Mocked chain: every account holds 5 ALGO + 10 USDC; Deflex quotes a USDC -> ALGO route. */
async function mockChain(
  page: Page,
  opts: { authAddr?: string } = {},
): Promise<ChainState> {
  const state: ChainState = { submitted: null, deflexTxns: [] };
  await page.route(/\/v2\/accounts\/[A-Z2-7]{58}/, (route) => {
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
          ...(opts.authAddr ? { "auth-addr": opts.authAddr } : {}),
          "min-balance": 200_000,
          "pending-rewards": 0,
          rewards: 0,
          round: 100,
          status: "Offline",
          "total-apps-opted-in": 0,
          "total-assets-opted-in": 1,
          "total-created-apps": 0,
          "total-created-assets": 0,
          assets: [
            { "asset-id": USDC, amount: 10_000_000, "is-frozen": false },
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
        "genesis-hash": GENESIS_HASH,
        "genesis-id": "mainnet-v1.0",
        "last-round": 100,
        "min-fee": 1000,
      },
    }),
  );
  await page.route(/\/v2\/transactions\/simulate/, (route) =>
    route.fulfill({
      status: 400,
      json: { message: "simulation not available" },
    }),
  );
  await page.route(/\/v2\/transactions$/, (route) => {
    state.submitted = route.request().postDataBuffer();
    return route.fulfill({ json: { txId: "SWAPGROUPTXID" } });
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
          txn: algosdk.msgpackRawDecode(
            splitSigned(state.submitted ?? Buffer.alloc(0))[0] ?? Buffer.alloc(0),
          ),
        }),
      ),
    }),
  );
  // Deflex: a quote and the (account specific) transactions of its route.
  await page.route(/deflex\.txnlab\.dev\/api\/fetchQuote/, (route) =>
    route.fulfill({
      headers: CORS,
      json: {
        txnPayload: "payload",
        quote: 4_000_000,
        route: [],
        userPriceImpact: 0,
      },
    }),
  );
  await page.route(
    /deflex\.txnlab\.dev\/api\/fetchExecuteSwapTxns/,
    (route) => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill({
        headers: CORS,
        json: {
          groupMetadata: [{ labelText: "Swap USDC for ALGO" }],
          txns: state.deflexTxns.map((data) => ({
            group: "g1",
            data,
            logicSigBlob: false,
          })),
        },
      });
    },
  );
  return state;
}

/** The USDC -> ALGO route of the mocked router: send USDC to a pool, pay the pool's fee. */
function routeTransactions(sender: string, pool: string): string[] {
  const sp = {
    fee: 1000n,
    minFee: 1000n,
    firstValid: 90n,
    lastValid: 1090n,
    genesisHash: Buffer.from(GENESIS_HASH, "base64"),
    genesisID: "mainnet-v1.0",
  };
  const txns = [
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: pool,
      assetIndex: USDC,
      amount: 1_000_000,
      suggestedParams: sp,
    }),
    algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: pool,
      amount: 100_000,
      suggestedParams: sp,
    }),
  ];
  algosdk.assignGroupID(txns);
  return txns.map((tx) =>
    Buffer.from(algosdk.encodeUnsignedTransaction(tx)).toString("base64"),
  );
}

/** The store reads its localStorage asset cache first (no indexer lookup). */
async function seedUsdc(page: Page) {
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
}

/** In-app route change - a page.goto would lock the wallet. */
async function navigate(page: Page, path: string) {
  await page.evaluate((to) => {
    history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

/** Address of the wallet's multisig account, read from the store. */
async function multisigAddress(page: Page): Promise<string> {
  return page.evaluate(() => {
    const host = document.querySelector("#app") as StoreHost | null;
    const accounts =
      host?.__vue_app__?.config.globalProperties.$store.state.wallet
        .privateAccounts ?? [];
    return String(accounts.find((a) => a.params)?.addr ?? "");
  });
}

test("a multisig account executes a swap by collecting the signatures on the Sign-all page", async ({
  page,
}) => {
  test.setTimeout(240000);
  const chain = await mockChain(page);
  await setupFreshWallet(page);
  await seedUsdc(page);

  // A basic account next to the wallet's first account, combined into a 1-of-2 multisig.
  await chooseNewAccountMenuItem(page, "Create basic account");
  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  await page.locator("#name").fill("Basic Account");
  await page.locator("#skip_challange").click();
  await page.waitForURL(/\/account\//, { timeout: 15000 });
  const basicAddress = page.url().split("/account/")[1];

  await chooseNewAccountMenuItem(page, "Create multisign account");
  await expect(page).toHaveURL(/\/new-account\/multisig/);
  await page.locator("#accounts").click();
  const panel = page.locator(".p-multiselect-overlay");
  await expect(panel).toBeVisible();
  const options = panel.locator(".p-multiselect-option");
  for (let i = (await options.count()) - 1; i >= 0; i--) {
    await options.nth(i).click();
  }
  await page.keyboard.press("Escape");
  await page.locator("#threshold").fill("1");
  await page.locator("#threshold").blur();
  await page.locator("#name").fill("Multisig swap");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.waitForURL(/\/accounts/, { timeout: 15000 });

  const msig = await multisigAddress(page);
  expect(msig).toMatch(/^[A-Z2-7]{58}$/);
  chain.deflexTxns = routeTransactions(msig, basicAddress);

  // Swap page: the multisig account is accepted and the user is told how it signs.
  await navigate(page, `/swap/${msig}/0/${USDC}`);
  await expect(page.getByTestId("swap-sign-all-info")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("swap-no-signer")).toHaveCount(0);

  // Only the Deflex (Haystack) router; Folks and Biatec would call real services.
  await page.locator('label[for="folksCheckbox"]').click();
  await page.locator('label[for="biatecCheckbox"]').click();
  await page.locator("#payamount").fill("1");
  await page.locator("#payamount").press("Tab");
  const quote = page.getByRole("button", { name: "Get quote" });
  await expect(quote).toBeEnabled({ timeout: 30000 });
  await quote.click();
  const execute = page.getByRole("button", { name: /Execute using Haystack/ });
  await expect(execute).toBeEnabled({ timeout: 30000 });
  await execute.click();

  // The group is on the Sign-all page, nothing was sent yet.
  await expect(page).toHaveURL(/\/signAll/, { timeout: 15000 });
  expect(chain.submitted).toBeNull();
  const signButtons = page.getByRole("button", { name: "Sign", exact: true });
  await expect(signButtons).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: /Send tx to the network/ }),
  ).toBeDisabled();

  // Each transaction of the group needs the multisig ceremony on the /sign page.
  for (let i = 0; i < 2; i++) {
    await signButtons.first().click();
    await expect(page).toHaveURL(/\/sign\//);
    await page
      .getByRole("button", { name: "Create multisig proposal" })
      .click();
    await page.locator(".p-multiselect").first().click();
    await page
      .locator(".p-multiselect-overlay .p-multiselect-option")
      .nth(0)
      .click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sign", exact: true }).click();
    const back = page.getByRole("button", {
      name: "Return to multi tx signature",
    });
    await expect(back).toBeEnabled({ timeout: 15000 });
    await back.click();
    await expect(page).toHaveURL(/\/signAll/);
  }

  // Everything signed: send the group, then return to the swap page.
  const send = page.getByRole("button", { name: /Send tx to the network/ });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByText(/Transaction confirmed in round/).first(),
  ).toBeVisible({ timeout: 30000 });
  expect(chain.submitted).not.toBeNull();
  // Both transactions of the group went out in one submission, signed by the multisig.
  const sent = splitSigned(chain.submitted!).map((raw) =>
    algosdk.decodeSignedTransaction(new Uint8Array(raw)),
  );
  expect(sent).toHaveLength(2);
  for (const stxn of sent) {
    expect(stxn.msig).toBeDefined();
    expect(stxn.txn.sender.toString()).toBe(msig);
    expect(stxn.txn.group).toBeDefined();
  }

  await page.getByTestId("sign-all-return").click();
  await expect(page).toHaveURL(new RegExp(`/swap/${msig}/0/${USDC}$`));
  await expect(page.locator("#payamount")).toBeVisible();
});

test("an account the wallet cannot sign for gets a clear error instead of an execute", async ({
  page,
}) => {
  test.setTimeout(120000);
  // The chain says the account is rekeyed to an address this wallet does not hold: no signing key.
  await mockChain(page, { authAddr: algosdk.generateAccount().addr.toString() });
  await setupFreshWallet(page);
  const addr = page.url().split("/account/")[1];
  await navigate(page, `/swap/${addr}`);
  await expect(page.getByTestId("swap-no-signer")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("swap-sign-all-info")).toHaveCount(0);
});
