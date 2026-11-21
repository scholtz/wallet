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
  /** Transactions the mocked Deflex route answers with (unsigned, or signed by a logic signature). */
  deflexTxns: { data: string; logicSigBlob: false | Record<number, number> }[];
  /** Unsigned transactions (base64) the mocked Biatec Router answers with. */
  biatecTxns: string[];
  /** Authorization header of every request the Biatec Router received. */
  biatecAuth: string[];
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
  const state: ChainState = {
    submitted: null,
    deflexTxns: [],
    biatecTxns: [],
    biatecAuth: [],
  };
  // Biatec Router: authenticated with the ARC-14 login in the Authorization header.
  await page.route(/router\.api\.biatec\.io\/api\/v1\/router\/routeTxs/, (route) => {
    const cors = {
      ...CORS,
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }
    state.biatecAuth.push(route.request().headers()["authorization"] ?? "");
    return route.fulfill({
      headers: cors,
      json: {
        routes: [
          {
            route: {
              inputAmount: 1_000_000,
              outputAmount: 4_000_000,
              totalNetworkFeeMicroAlgos: 2000,
              hops: [],
            },
            txsToSign: state.biatecTxns,
          },
        ],
      },
    });
  });
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
          txns: state.deflexTxns.map((entry) => ({ group: "g1", ...entry })),
        },
      });
    },
  );
  return state;
}

/**
 * The USDC -> ALGO route of the mocked router: send USDC to a pool, pay the pool's fee and, like
 * the real router does for some pools, a transaction the router's own logic signature already signed.
 */
function routeTransactions(sender: string, pool: string): ChainState["deflexTxns"] {
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
  // "#pragma version 2; int 1" - approves everything, its address is no wallet account.
  const lsig = new algosdk.LogicSigAccount(
    new Uint8Array([2, 0x20, 1, 1, 0x22]),
  );
  txns.push(
    algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: lsig.address(),
      receiver: pool,
      amount: 0,
      suggestedParams: sp,
    }),
  );
  algosdk.assignGroupID(txns);
  const lsigBlob = algosdk.signLogicSigTransactionObject(
    txns[2],
    lsig,
  ).blob;
  return [
    ...txns.slice(0, 2).map((tx) => ({
      data: Buffer.from(algosdk.encodeUnsignedTransaction(tx)).toString(
        "base64",
      ),
      logicSigBlob: false as const,
    })),
    {
      data: "",
      logicSigBlob: Object.fromEntries(Array.from(lsigBlob).map((b, i) => [i, b])),
    },
  ];
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

/** Creates a basic account next to the wallet's first one and combines both into a 2-of-2 multisig. */
async function createMultisig(
  page: Page,
): Promise<{ msig: string; basicAddress: string }> {
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
  await page.locator("#threshold").fill("2");
  await page.locator("#threshold").blur();
  await page.locator("#name").fill("Multisig swap");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.waitForURL(/\/accounts/, { timeout: 15000 });

  const msig = await multisigAddress(page);
  expect(msig).toMatch(/^[A-Z2-7]{58}$/);
  return { msig, basicAddress };
}

/** Signs the transaction shown on the Sign-all page through the multisig ceremony on /sign. */
async function signWithBothMultisigSigners(page: Page) {
  await page.getByRole("button", { name: "Sign", exact: true }).first().click();
  await expect(page).toHaveURL(/\/sign\//);
  await page.getByRole("button", { name: "Create multisig proposal" }).click();
  await page.locator(".p-multiselect").first().click();
  // Both signers of the 2-of-2 sign in this visit; the threshold is only met with both.
  const signers = page.locator(".p-multiselect-overlay .p-multiselect-option");
  await signers.nth(0).click();
  await signers.nth(1).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sign", exact: true }).click();
  const back = page.getByRole("button", { name: "Return to multi tx signature" });
  await expect(back).toBeEnabled({ timeout: 15000 });
  await back.click();
  await expect(page).toHaveURL(/\/signAll/);
}

test("a multisig account executes a swap by collecting the signatures on the Sign-all page", async ({
  page,
}) => {
  test.setTimeout(240000);
  const chain = await mockChain(page);
  await setupFreshWallet(page);
  await seedUsdc(page);

  const { msig, basicAddress } = await createMultisig(page);
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
  // Three transactions, but the logic-signed one needs nobody's signature: two Sign buttons,
  // no error toast about it, and "Return to swap" stays disabled until the user signed something.
  await expect(page.locator(".p-datatable-tbody > tr")).toHaveCount(3);
  await expect(signButtons).toHaveCount(2);
  await expect(page.locator(".p-toast-message-error")).toHaveCount(0);
  await expect(page.getByTestId("sign-all-return")).toBeDisabled();
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
    // Both signers of the 2-of-2 sign in this visit; the threshold is only met with both.
    const signers = page.locator(
      ".p-multiselect-overlay .p-multiselect-option",
    );
    await signers.nth(0).click();
    await signers.nth(1).click();
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
  expect(sent).toHaveLength(3);
  for (const stxn of sent.slice(0, 2)) {
    // Threshold 2 of 2: both subsignatures are present.
    expect(stxn.msig?.thr).toBe(2);
    expect(stxn.msig?.subsig.filter((s) => !!s.s)).toHaveLength(2);
    expect(stxn.txn.sender.toString()).toBe(msig);
  }
  expect(sent[2].lsig).toBeDefined();
  expect(new Set(sent.map((s) => Buffer.from(s.txn.group!).toString("hex"))).size).toBe(1);

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
  // The inline message is the one report: looking up the signer raises no toast of its own.
  await expect(page.locator(".p-toast-message-error")).toHaveCount(0);
});

test("a multisig account authorizes the Biatec Router once on the Sign-all page and then gets quotes", async ({
  page,
}) => {
  test.setTimeout(240000);
  const chain = await mockChain(page);
  await setupFreshWallet(page);
  await seedUsdc(page);
  const { msig, basicAddress } = await createMultisig(page);
  const unsigned = routeTransactions(msig, basicAddress).slice(0, 2);
  chain.biatecTxns = unsigned.map((entry) => entry.data);

  await navigate(page, `/swap/${msig}/0/${USDC}`);
  await expect(page.getByTestId("swap-sign-all-info")).toBeVisible({
    timeout: 30000,
  });
  // Only the Biatec Router; Folks and Haystack would call real services.
  await page.locator('label[for="folksCheckbox"]').click();
  await page.locator('label[for="deflexCheckbox"]').click();

  // The router's login cannot be signed in place for a multisig: the page offers the button
  // instead of hiding the router, and a quote without a login asks for it without any error toast.
  const authorize = page.getByTestId("swap-router-authorize");
  await expect(authorize).toBeVisible();
  await page.locator("#payamount").fill("1");
  await page.locator("#payamount").press("Tab");
  await page.getByRole("button", { name: "Get quote" }).click();
  await expect(page.locator(".p-toast-message-error")).toHaveCount(0);
  expect(chain.biatecAuth).toHaveLength(0);

  await authorize.click();
  await expect(page).toHaveURL(/\/signAll/, { timeout: 15000 });
  // A login, not a payment: one transaction, nothing to send, and no way back before it is signed.
  await expect(page.locator(".p-datatable-tbody > tr")).toHaveCount(1);
  await expect(page.getByTestId("sign-all-arc14-info")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Send tx to the network/ }),
  ).toHaveCount(0);
  await expect(page.getByTestId("sign-all-return")).toBeDisabled();

  await signWithBothMultisigSigners(page);
  await expect(page.getByTestId("sign-all-arc14-info")).toContainText(
    /signed and kept/i,
  );
  await expect(page.getByTestId("sign-all-return")).toBeEnabled();
  expect(chain.submitted).toBeNull();
  await page.getByTestId("sign-all-return").click();
  await expect(page).toHaveURL(new RegExp(`/swap/${msig}/0/${USDC}$`));

  // The stored login is in place: no button any more, and the router quote carries it.
  await expect(page.getByTestId("swap-sign-all-info")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("swap-router-authorize")).toHaveCount(0);
  await page.locator("#payamount").fill("1");
  await page.locator("#payamount").press("Tab");
  await page.locator('label[for="folksCheckbox"]').click();
  await page.locator('label[for="deflexCheckbox"]').click();
  await page.getByRole("button", { name: "Get quote" }).click();
  const execute = page.getByRole("button", {
    name: /Execute using Biatec router/,
  });
  await expect(execute).toBeEnabled({ timeout: 30000 });
  expect(chain.biatecAuth.length).toBeGreaterThan(0);
  for (const header of chain.biatecAuth) {
    expect(header.startsWith("SigTx ")).toBe(true);
    const login = algosdk.decodeSignedTransaction(
      new Uint8Array(Buffer.from(header.slice("SigTx ".length), "base64")),
    );
    expect(login.txn.sender.toString()).toBe(msig);
    expect(login.txn.note && Buffer.from(login.txn.note).toString()).toBe(
      "BiatecRouter#ARC14",
    );
    expect(login.msig?.subsig.filter((s) => !!s.s)).toHaveLength(2);
  }

  // Executing hands the route's transactions to the Sign-all page like any other router.
  await execute.click();
  await expect(page).toHaveURL(/\/signAll/, { timeout: 15000 });
  await expect(page.locator(".p-datatable-tbody > tr")).toHaveCount(2);
  await expect(page.getByTestId("sign-all-arc14-info")).toHaveCount(0);
  expect(chain.submitted).toBeNull();
});

test("the ARC-14 page signs a multisig login on the Sign-all page and shows the stored token", async ({
  page,
}) => {
  test.setTimeout(240000);
  await mockChain(page);
  await setupFreshWallet(page);
  const { msig } = await createMultisig(page);

  await navigate(page, `/arc14/${msig}`);
  const signButton = page.getByRole("button", {
    name: "Sign authentication transaction",
  });
  await expect(signButton).toBeVisible({ timeout: 30000 });

  // A realm without the #ARC14 marker would not be recognised as a login: refused with a message.
  await page.locator("#realm").fill("Service");
  await signButton.click();
  await expect(page.locator(".p-toast-message-error")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/arc14/${msig}`));

  await page.locator("#realm").fill("Service#ARC14");
  await signButton.click();
  await expect(page).toHaveURL(/\/signAll/, { timeout: 15000 });
  await expect(page.getByTestId("sign-all-arc14-info")).toBeVisible();
  await expect(page.getByTestId("sign-all-return")).toBeDisabled();
  await signWithBothMultisigSigners(page);
  await expect(page.getByTestId("sign-all-return")).toBeEnabled();
  await page.getByTestId("sign-all-return").click();

  await expect(page).toHaveURL(/\/arc14\//);
  await expect(page.locator("#realm")).toHaveValue("Service#ARC14");
  await expect(page.locator("textarea")).toHaveValue(/^SigTx /, {
    timeout: 15000,
  });
});
