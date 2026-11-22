import { test, expect, type Page } from "@playwright/test";
import algosdk from "algosdk";
import {
  chooseNewAccountMenuItem,
  setupFreshWallet,
  spaNavigate,
} from "../support/wallet";

// Asset management (freeze / clawback / change addresses / destroy): each action is signed by the
// asset's role address - in place for a key/HD account, on the Sign-all page for a multisig. All
// network access is mocked; the submitted transaction is decoded and checked.

const ASSET_ID = 777001;
const GENESIS_HASH = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";

interface MockAsset {
  creator: string;
  total: number;
  decimals: number;
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
}

interface ChainState {
  asset: MockAsset;
  /** addr -> holding of ASSET_ID; absent = not opted in. */
  holdings: Record<string, { amount: number; frozen: boolean }>;
  /** Accounts whose holding lookup fails with a node error. */
  failingHoldings: Set<string>;
  /** The node accepted the transaction but never confirms it. */
  neverConfirm: boolean;
  /** The pool rejected the transaction after it was accepted. */
  poolError: string;
  /** The node's last round (a transaction is valid up to round 1100). */
  lastRound: number;
  /** The node does not know the transaction (never received, or dropped). */
  unknownTx: boolean;
  submitted: Buffer | null;
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

function submittedTxn(chain: ChainState): algosdk.SignedTransaction {
  expect(chain.submitted).not.toBeNull();
  const parts = splitSigned(chain.submitted!);
  expect(parts).toHaveLength(1);
  return algosdk.decodeSignedTransaction(new Uint8Array(parts[0]));
}

async function mockChain(page: Page, asset: MockAsset): Promise<ChainState> {
  const state: ChainState = {
    asset,
    holdings: {},
    failingHoldings: new Set(),
    neverConfirm: false,
    poolError: "",
    lastRound: 100,
    unknownTx: false,
    submitted: null,
  };
  const assetJson = () => ({
    index: ASSET_ID,
    params: {
      creator: state.asset.creator,
      total: state.asset.total,
      decimals: state.asset.decimals,
      "default-frozen": false,
      name: "Managed Token",
      "unit-name": "MGT",
      ...(state.asset.manager ? { manager: state.asset.manager } : {}),
      ...(state.asset.reserve ? { reserve: state.asset.reserve } : {}),
      ...(state.asset.freeze ? { freeze: state.asset.freeze } : {}),
      ...(state.asset.clawback ? { clawback: state.asset.clawback } : {}),
    },
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
          "min-balance": 200_000,
          "pending-rewards": 0,
          rewards: 0,
          round: 100,
          status: "Offline",
          "total-apps-opted-in": 0,
          "total-assets-opted-in": 0,
          "total-created-apps": 0,
          "total-created-assets": 0,
        },
      },
    });
  });
  // Registered later = matched first: the holding of one account, and its created assets.
  await page.route(
    new RegExp(`/v2/accounts/([A-Z2-7]{58})/assets/${ASSET_ID}`),
    (route) => {
      const addr = new URL(route.request().url()).pathname.split("/")[3];
      if (state.failingHoldings.has(addr)) {
        return route.fulfill({ status: 500, json: { message: "node error" } });
      }
      const holding = state.holdings[addr];
      if (!holding) {
        return route.fulfill({
          status: 404,
          json: { message: "account asset info not found" },
        });
      }
      return route.fulfill({
        json: {
          round: 100,
          "asset-holding": {
            "asset-id": ASSET_ID,
            amount: holding.amount,
            "is-frozen": holding.frozen,
          },
        },
      });
    },
  );
  await page.route(
    /\/v2\/accounts\/([A-Z2-7]{58})\/created-assets/,
    (route) => {
      const addr = new URL(route.request().url()).pathname.split("/")[3];
      return route.fulfill({
        json: {
          "current-round": 100,
          assets:
            addr === state.asset.creator
              ? [{ ...assetJson(), deleted: false }]
              : [],
        },
      });
    },
  );
  await page.route(/\/v2\/assets\/[0-9]+($|\?)/, (route) =>
    route.fulfill({ status: 404, json: { message: "asset does not exist" } }),
  );
  await page.route(new RegExp(`/v2/assets/${ASSET_ID}($|\\?)`), (route) =>
    route.fulfill({ json: assetJson() }),
  );
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
    // The ledger applies a freeze / clawback, so a page that reloads holdings sees the effect.
    for (const raw of splitSigned(state.submitted ?? Buffer.alloc(0))) {
      const { txn } = algosdk.decodeSignedTransaction(new Uint8Array(raw));
      if (txn.assetFreeze) {
        const held = state.holdings[txn.assetFreeze.freezeAccount.toString()];
        if (held) held.frozen = txn.assetFreeze.frozen;
      }
      const from = txn.assetTransfer?.assetSender?.toString();
      if (txn.assetTransfer && from) {
        const amount = Number(txn.assetTransfer.amount);
        const to = txn.assetTransfer.receiver.toString();
        if (state.holdings[from]) state.holdings[from].amount -= amount;
        if (state.holdings[to]) state.holdings[to].amount += amount;
      }
    }
    return route.fulfill({ json: { txId: "ASSETMGMTTXID" } });
  });
  await page.route(/\/v2\/status$/, (route) =>
    route.fulfill({
      json: {
        "catchup-time": 0,
        "last-round": state.lastRound,
        "last-version": "future",
        "next-version": "future",
        "next-version-round": 101,
        "next-version-supported": true,
        "stopped-at-unsupported-round": false,
        "time-since-last-round": 0,
      },
    }),
  );
  // algosdk waits for the next block between two looks at the pending transaction.
  await page.route(/\/v2\/status\/wait-for-block-after\/(\d+)/, (route) => {
    const after = Number(route.request().url().split("/").pop());
    return route.fulfill({
      json: {
        "catchup-time": 0,
        "last-round": after + 1,
        "last-version": "future",
        "next-version": "future",
        "next-version-round": after + 2,
        "next-version-supported": true,
        "stopped-at-unsupported-round": false,
        "time-since-last-round": 0,
      },
    });
  });
  await page.route(/\/v2\/transactions\/pending\//, (route) =>
    route.fulfill({
      contentType: "application/msgpack",
      body: Buffer.from(
        algosdk.msgpackRawEncode({
          ...(state.neverConfirm ? {} : { "confirmed-round": 101 }),
          "pool-error": state.poolError,
          txn: algosdk.msgpackRawDecode(
            splitSigned(state.submitted ?? Buffer.alloc(0))[0] ??
              Buffer.alloc(0),
          ),
        }),
      ),
    }),
  );
  // Registered last, so it is asked first: an unknown transaction is a 404, anything else falls through.
  await page.route(/\/v2\/transactions\/pending\//, (route) =>
    state.unknownTx
      ? route.fulfill({
          status: 404,
          json: { message: "transaction not found" },
        })
      : route.fallback(),
  );
  return state;
}

const other = () => algosdk.generateAccount().addr.toString();

/** Fresh wallet; its auto-created HD account (signs in place) holds every role. */
async function walletOwningAsset(page: Page, roles: Partial<MockAsset> = {}) {
  const placeholder = other();
  const chain = await mockChain(page, {
    creator: placeholder,
    total: 1000,
    decimals: 2,
  });
  await setupFreshWallet(page);
  const owner = page.url().split("/account/")[1];
  chain.asset = {
    creator: owner,
    total: 1000,
    decimals: 2,
    manager: owner,
    reserve: owner,
    freeze: owner,
    clawback: owner,
    ...roles,
  };
  return { chain, owner };
}

test.describe.configure({ mode: "parallel" });

test("the asset manager lists the wallet's assets and opens one", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { owner } = await walletOwningAsset(page);
  await spaNavigate(page, "/account/actions/" + owner);
  await page.getByTestId("actions-asset-manage").click();
  await expect(page).toHaveURL(/\/asset$/);
  await page.getByTestId(`asset-hub-manage-${ASSET_ID}`).click();
  await expect(page).toHaveURL(new RegExp(`/asset/manage/${ASSET_ID}$`));
  await expect(page.getByTestId("asset-manage-id")).toHaveText(
    String(ASSET_ID),
  );
  await expect(page.getByTestId("asset-manage-role-freeze")).toContainText(
    owner.slice(0, 4),
  );

  // An unknown asset id is reported, not shown as an empty asset.
  await spaNavigate(page, "/asset/manage/999999999");
  await expect(page.getByTestId("asset-manage-error")).toBeVisible({
    timeout: 15000,
  });
});

test("freezes a holder in place, refusing an account that is not opted in", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { chain, owner } = await walletOwningAsset(page);
  const holder = other();
  const stranger = other();
  chain.holdings[holder] = { amount: 250, frozen: false };

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await expect(page.getByTestId("freeze-target")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("asset-manage-sign-all-info")).toHaveCount(0);

  await page.getByTestId("freeze-target").fill(stranger);
  await expect(page.getByTestId("asset-manage-problem")).toContainText(
    "not opted in",
  );
  await expect(page.getByTestId("freeze-submit")).toBeDisabled();

  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("freeze-holder-state")).toContainText(
    "2.5 - not frozen",
  );
  await expect(page.getByTestId("unfreeze-submit")).toBeDisabled();
  await page.getByTestId("freeze-submit").click();
  await expect(page.getByTestId("asset-manage-sent")).toBeVisible({
    timeout: 30000,
  });

  const stxn = submittedTxn(chain);
  expect(stxn.txn.type).toBe(algosdk.TransactionType.afrz);
  expect(stxn.txn.sender.toString()).toBe(owner);
  expect(stxn.txn.assetFreeze?.assetIndex).toBe(BigInt(ASSET_ID));
  expect(stxn.txn.assetFreeze?.freezeAccount.toString()).toBe(holder);
  expect(stxn.txn.assetFreeze?.frozen).toBe(true);
  expect(stxn.sig).toBeDefined();
  // Signed in place: valid for a short window only, so an unconfirmed send expires within minutes.
  expect(stxn.txn.lastValid - stxn.txn.firstValid).toBe(50n);

  // One signal for the result, and it says the transaction was confirmed.
  await expect(page.getByTestId("asset-manage-sent")).toContainText(
    "confirmed",
  );
  await expect(page.locator(".p-toast-message-success")).toHaveCount(0);

  // The page shows the holder's new state: unfreezing is offered right away.
  await expect(page.getByTestId("freeze-holder-state")).toContainText(
    "2.5 - frozen",
  );
  await expect(page.getByTestId("unfreeze-submit")).toBeEnabled();
  await expect(page.getByTestId("freeze-submit")).toBeDisabled();

  // The result belongs to this action, not to the next one opened on the same page.
  await page.getByTestId("asset-manage-action-modify").click();
  await expect(page.getByTestId("modify-reserve")).toBeVisible();
  await expect(page.getByTestId("asset-manage-sent")).toHaveCount(0);
});

test("a holding the node cannot load is reported as such, not as not opted in", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { chain } = await walletOwningAsset(page);
  const holder = other();
  chain.failingHoldings.add(holder);

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await expect(page.getByTestId("freeze-target")).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("asset-manage-problem")).toContainText(
    "could not be loaded",
  );
  await expect(page.getByTestId("asset-manage-problem")).not.toContainText(
    "not opted in",
  );
  await expect(page.getByTestId("freeze-submit")).toBeDisabled();
  await expect(page.getByTestId("unfreeze-submit")).toBeDisabled();
  expect(chain.submitted).toBeNull();
});

test("claws back units of a holder, refusing more than the holder has", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { chain, owner } = await walletOwningAsset(page);
  const holder = other();
  chain.holdings[holder] = { amount: 250, frozen: true };
  chain.holdings[owner] = { amount: 750, frozen: false };

  await spaNavigate(page, `/asset/revoke/${ASSET_ID}`);
  await expect(page.getByTestId("clawback-receiver")).toHaveValue(owner, {
    timeout: 15000,
  });
  await page.getByTestId("clawback-target").fill(holder);
  await expect(page.getByTestId("clawback-target-balance")).toContainText(
    "2.5",
  );
  await page.getByTestId("clawback-amount").fill("3");
  await expect(page.getByTestId("asset-manage-problem")).toContainText(
    "does not have",
  );
  await expect(page.getByTestId("clawback-submit")).toBeDisabled();
  await page.getByTestId("clawback-amount").fill("1.255");
  await expect(page.getByTestId("clawback-submit")).toBeDisabled();

  await page.getByTestId("clawback-max").click();
  await expect(page.getByTestId("clawback-amount")).toHaveValue("2.5");
  await page.getByTestId("clawback-submit").click();
  await expect(page.getByTestId("asset-manage-sent")).toBeVisible({
    timeout: 30000,
  });

  const { txn } = submittedTxn(chain);
  expect(txn.type).toBe(algosdk.TransactionType.axfer);
  expect(txn.sender.toString()).toBe(owner);
  expect(txn.assetTransfer?.assetSender?.toString()).toBe(holder);
  expect(txn.assetTransfer?.receiver.toString()).toBe(owner);
  expect(txn.assetTransfer?.amount).toBe(250n);

  // The holder's balance is read again: nothing is left to claw back.
  await expect(page.getByTestId("clawback-target-balance")).toContainText(
    "Balance: 0",
  );
});

test("changes the addresses, asking to confirm a cleared role", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { chain, owner } = await walletOwningAsset(page);
  const newReserve = other();

  await spaNavigate(page, `/asset/modify/${ASSET_ID}`);
  await expect(page.getByTestId("modify-reserve")).toHaveValue(owner, {
    timeout: 15000,
  });
  await expect(page.getByTestId("modify-submit")).toBeDisabled();

  await page.getByTestId("modify-reserve").fill("NOT-AN-ADDRESS");
  await expect(page.getByTestId("asset-manage-problem")).toContainText(
    "not a valid",
  );
  await page.getByTestId("modify-reserve").fill(newReserve);
  await page.getByTestId("modify-clawback").fill("");
  await expect(page.getByTestId("modify-cleared-warning")).toContainText(
    "Clawback address",
  );
  await expect(page.getByTestId("modify-submit")).toBeDisabled();
  await page.locator('label[for="modifyConfirmClear"]').click();
  await expect(page.getByTestId("modify-submit")).toBeEnabled();
  await page.getByTestId("modify-submit").click();
  await expect(page.getByTestId("asset-manage-sent")).toBeVisible({
    timeout: 30000,
  });

  const { txn } = submittedTxn(chain);
  expect(txn.type).toBe(algosdk.TransactionType.acfg);
  expect(txn.sender.toString()).toBe(owner);
  expect(txn.assetConfig?.assetIndex).toBe(BigInt(ASSET_ID));
  expect(txn.assetConfig?.manager?.toString()).toBe(owner);
  expect(txn.assetConfig?.reserve?.toString()).toBe(newReserve);
  expect(txn.assetConfig?.freeze?.toString()).toBe(owner);
  expect(txn.assetConfig?.clawback).toBeUndefined();
});

test("destroys the asset only once the creator holds the whole supply", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { chain, owner } = await walletOwningAsset(page);
  chain.holdings[owner] = { amount: 900, frozen: false };

  await spaNavigate(page, `/asset/destroy/${ASSET_ID}`);
  await expect(page.getByTestId("destroy-creator-holding")).toContainText(
    "9 / 10",
    {
      timeout: 15000,
    },
  );
  await expect(page.getByTestId("asset-manage-problem")).toContainText(
    "Not all units",
  );
  await expect(page.getByTestId("destroy-submit")).toBeDisabled();

  // All units are back: reopen the page (in-app) so it reads the creator's balance again.
  chain.holdings[owner] = { amount: 1000, frozen: false };
  await spaNavigate(page, `/asset/manage/${ASSET_ID}`);
  await page.getByTestId("asset-manage-action-destroy").click();
  await expect(page.getByTestId("destroy-creator-holding")).toContainText(
    "10 / 10",
  );
  await expect(page.getByTestId("destroy-submit")).toBeDisabled();
  await page.locator('label[for="destroyConfirm"]').click();
  await page.getByTestId("destroy-submit").click();
  await expect(page).toHaveURL(new RegExp(`/asset\\?destroyed=${ASSET_ID}$`), {
    timeout: 30000,
  });
  // The mocked indexer still lists the asset (it lags the node); the hub leaves it out.
  await expect(page.getByTestId("asset-hub-table")).toBeVisible();
  await expect(page.getByTestId(`asset-hub-manage-${ASSET_ID}`)).toHaveCount(0);

  const { txn } = submittedTxn(chain);
  expect(txn.type).toBe(algosdk.TransactionType.acfg);
  expect(txn.assetConfig?.assetIndex).toBe(BigInt(ASSET_ID));
  expect(txn.assetConfig?.manager).toBeUndefined();
  expect(txn.assetConfig?.reserve).toBeUndefined();
});

test("a role held by an address outside the wallet cannot be used, a disabled one is shown as such", async ({
  page,
}) => {
  test.setTimeout(120000);
  await walletOwningAsset(page, { freeze: other(), clawback: undefined });

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await expect(page.getByTestId("asset-manage-no-signer")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("freeze-target")).toHaveCount(0);

  await spaNavigate(page, `/asset/revoke/${ASSET_ID}`);
  await expect(page.getByTestId("asset-manage-role-missing")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("clawback-target")).toHaveCount(0);
  await expect(page.getByTestId("asset-manage-action-clawback")).toBeDisabled();
});

interface StoreHost {
  __vue_app__?: {
    config: {
      globalProperties: {
        $store: {
          state: {
            wallet: { privateAccounts: { addr: string; params?: object }[] };
          };
        };
      };
    };
  };
}

/** Creates a basic account next to the wallet's first one and combines both into a 2-of-2 multisig. */
async function createMultisig(page: Page): Promise<string> {
  await chooseNewAccountMenuItem(page, "Create basic account");
  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  await page.locator("#name").fill("Basic Account");
  await page.locator("#skip_challange").click();
  await page.waitForURL(/\/account\//, { timeout: 15000 });

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
  await page.locator("#name").fill("Multisig manager");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.waitForURL(/\/accounts/, { timeout: 15000 });

  const msig = await page.evaluate(() => {
    const host = document.querySelector("#app") as StoreHost | null;
    const accounts =
      host?.__vue_app__?.config.globalProperties.$store.state.wallet
        .privateAccounts ?? [];
    return String(accounts.find((a) => a.params)?.addr ?? "");
  });
  expect(msig).toMatch(/^[A-Z2-7]{58}$/);
  return msig;
}

test("a multisig freeze address signs on the Sign-all page and returns to asset management", async ({
  page,
}) => {
  test.setTimeout(240000);
  const { chain } = await walletOwningAsset(page);
  const msig = await createMultisig(page);
  chain.asset.freeze = msig;
  const holder = other();
  chain.holdings[holder] = { amount: 10, frozen: true };

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await expect(page.getByTestId("asset-manage-sign-all-info")).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("freeze-holder-state")).toContainText("frozen");
  await page.getByTestId("unfreeze-submit").click();

  await expect(page).toHaveURL(/\/signAll/, { timeout: 15000 });
  expect(chain.submitted).toBeNull();
  // One transaction; its row starts expanded (a second table row) and says what it does.
  await expect(page.locator(".p-datatable-tbody > tr")).toHaveCount(2);
  await expect(page.getByTestId("tx-review-details")).toBeVisible();
  await expect(page.getByTestId("sign-special-summary")).toContainText(
    holder.slice(0, 4),
  );

  await page.getByRole("button", { name: "Sign", exact: true }).first().click();
  await expect(page).toHaveURL(/\/sign\//);
  // The co-signer sees the freeze, not an error about a missing "pay to" address.
  await expect(
    page.getByText("Pay To address seems to be malformed."),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Create multisig proposal" }).click();
  await page.locator(".p-multiselect").first().click();
  const signers = page.locator(".p-multiselect-overlay .p-multiselect-option");
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

  const send = page.getByRole("button", { name: /Send tx to the network/ });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByText(/Transaction confirmed in round/).first(),
  ).toBeVisible({
    timeout: 30000,
  });
  const stxn = submittedTxn(chain);
  expect(stxn.txn.type).toBe(algosdk.TransactionType.afrz);
  expect(stxn.txn.sender.toString()).toBe(msig);
  expect(stxn.txn.assetFreeze?.freezeAccount.toString()).toBe(holder);
  expect(stxn.txn.assetFreeze?.frozen).toBe(false);
  expect(stxn.msig?.subsig.filter((s) => !!s.s)).toHaveLength(2);

  const ret = page.getByTestId("sign-all-return");
  await expect(ret).toHaveText(/Return to asset management/);
  await ret.click();
  await expect(page).toHaveURL(new RegExp(`/asset/freeze/${ASSET_ID}$`));
  await expect(page.getByTestId("freeze-target")).toBeVisible({
    timeout: 15000,
  });
});

test("a role that changed on the chain is not overwritten by an older form", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { chain, owner } = await walletOwningAsset(page);
  const newReserve = other();

  await spaNavigate(page, `/asset/modify/${ASSET_ID}`);
  await expect(page.getByTestId("modify-reserve")).toHaveValue(owner, {
    timeout: 15000,
  });
  // Another session changes the freeze address while this form is open; only the reserve is edited.
  chain.asset.freeze = other();
  await page.getByTestId("modify-reserve").fill(newReserve);
  await page.getByTestId("modify-submit").click();

  await expect(page.locator(".p-toast-message-error")).toContainText(
    "addresses changed",
  );
  expect(chain.submitted).toBeNull();
  // The form starts over from the chain's current addresses.
  await expect(page.getByTestId("modify-freeze")).toHaveValue(
    chain.asset.freeze!,
  );
  await expect(page.getByTestId("modify-reserve")).toHaveValue(owner);
});

test("what was typed in the address form survives a switch of the action tab", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { owner } = await walletOwningAsset(page);
  const newReserve = other();

  await spaNavigate(page, `/asset/modify/${ASSET_ID}`);
  await expect(page.getByTestId("modify-reserve")).toHaveValue(owner, {
    timeout: 15000,
  });
  await page.getByTestId("modify-reserve").fill(newReserve);
  await page.getByTestId("asset-manage-action-freeze").click();
  await expect(page.getByTestId("freeze-target")).toBeVisible();
  await page.getByTestId("asset-manage-action-modify").click();
  await expect(page.getByTestId("modify-reserve")).toHaveValue(newReserve);
});

test("clearing one more role needs its own confirmation", async ({ page }) => {
  test.setTimeout(120000);
  await walletOwningAsset(page);

  await spaNavigate(page, `/asset/modify/${ASSET_ID}`);
  await expect(page.getByTestId("modify-reserve")).not.toHaveValue("", {
    timeout: 15000,
  });
  await page.getByTestId("modify-reserve").fill("");
  await page.locator('label[for="modifyConfirmClear"]').click();
  await expect(page.getByTestId("modify-submit")).toBeEnabled();

  // The tick was given for the reserve only: clearing the manager asks again.
  await page.getByTestId("modify-manager").fill("");
  await expect(page.getByTestId("modify-submit")).toBeDisabled();
  await expect(page.getByTestId("modify-cleared-warning")).toContainText(
    "never be changed or destroyed",
  );
  await page.locator('label[for="modifyConfirmClear"]').click();
  await expect(page.getByTestId("modify-submit")).toBeEnabled();
});

test("an unconfirmed send locks the actions until it was checked again", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { chain } = await walletOwningAsset(page);
  const holder = other();
  chain.holdings[holder] = { amount: 250, frozen: false };
  chain.neverConfirm = true;

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("freeze-holder-state")).toContainText(
    "not frozen",
  );
  await page.getByTestId("freeze-submit").click();

  // Sent, not confirmed: a warning, and the same action cannot be sent a second time.
  await expect(page.getByTestId("asset-manage-unconfirmed")).toBeVisible({
    timeout: 90000,
  });
  await expect(page.getByTestId("asset-manage-sent")).toBeVisible();
  await expect(page.getByTestId("freeze-submit")).toBeDisabled();
  await expect(page.getByTestId("unfreeze-submit")).toBeDisabled();

  // Checking while it is still pending (its validity window is open) keeps the page locked.
  await page.getByTestId("asset-manage-check-again").click();
  await expect(page.getByTestId("asset-manage-unconfirmed")).toContainText(
    "Still pending",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("freeze-submit")).toBeDisabled();
  await expect(page.getByTestId("unfreeze-submit")).toBeDisabled();

  // The lock is not lost by leaving the page: another page and back, it is still there.
  await spaNavigate(page, `/asset/manage/${ASSET_ID}`);
  await expect(page.getByTestId("asset-manage-id")).toBeVisible();
  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await expect(page.getByTestId("asset-manage-unconfirmed")).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("freeze-holder-state")).toBeVisible();
  await expect(page.getByTestId("freeze-submit")).toBeDisabled();

  // It confirms meanwhile: checking again shows the new state and unlocks the page.
  chain.neverConfirm = false;
  await page.getByTestId("asset-manage-check-again").click();
  await expect(page.getByTestId("asset-manage-unconfirmed")).toHaveCount(0, {
    timeout: 30000,
  });
  await expect(page.getByTestId("freeze-holder-state")).toContainText(
    "2.5 - frozen",
  );
  await expect(page.getByTestId("unfreeze-submit")).toBeEnabled();
});

test("a transaction the pool rejected after submission does not lock the page", async ({
  page,
}) => {
  test.setTimeout(120000);
  const { chain } = await walletOwningAsset(page);
  const holder = other();
  chain.holdings[holder] = { amount: 250, frozen: false };
  chain.neverConfirm = true;
  chain.poolError = "transaction rejected by the pool: overspend";

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("freeze-holder-state")).toContainText(
    "not frozen",
  );
  await page.getByTestId("freeze-submit").click();

  // The node's reason is shown and nothing is pending: the form is usable again.
  await expect(page.locator(".p-toast-message-error")).toContainText(
    "overspend",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("asset-manage-unconfirmed")).toHaveCount(0);
  await expect(page.getByTestId("freeze-submit")).toBeEnabled();
});

test("a transaction that expired without confirming is reported and unlocks the page", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { chain } = await walletOwningAsset(page);
  const holder = other();
  chain.holdings[holder] = { amount: 250, frozen: false };
  chain.neverConfirm = true;

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("freeze-holder-state")).toContainText(
    "not frozen",
  );
  await page.getByTestId("freeze-submit").click();
  await expect(page.getByTestId("asset-manage-unconfirmed")).toBeVisible({
    timeout: 90000,
  });

  // The node is past the last round the transaction was valid in: it can never confirm now.
  chain.lastRound = 5000;
  await page.getByTestId("asset-manage-check-again").click();
  await expect(page.locator(".p-toast-message-error")).toContainText(
    "safe to try again",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("asset-manage-unconfirmed")).toHaveCount(0);
  // Unlocked: the mocked ledger applied the freeze on submission, so unfreezing is what is offered.
  await expect(page.getByTestId("unfreeze-submit")).toBeEnabled();
});

test("a transaction this node does not know keeps the lock until it expired", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { chain } = await walletOwningAsset(page);
  const holder = other();
  chain.holdings[holder] = { amount: 250, frozen: false };
  chain.neverConfirm = true;
  chain.unknownTx = true;

  await spaNavigate(page, `/asset/freeze/${ASSET_ID}`);
  await page.getByTestId("freeze-target").fill(holder);
  await expect(page.getByTestId("freeze-holder-state")).toContainText(
    "not frozen",
  );
  await page.getByTestId("freeze-submit").click();

  // Another node of a pool answers 404 for a transaction that is queued elsewhere: not proof of
  // anything, so the page stays locked while the validity window is open.
  await expect(page.getByTestId("asset-manage-unconfirmed")).toBeVisible({
    timeout: 90000,
  });
  await page.getByTestId("asset-manage-check-again").click();
  await expect(page.getByTestId("asset-manage-unconfirmed")).toContainText(
    "Still pending",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("unfreeze-submit")).toBeDisabled();

  // Past the last valid round it can never confirm: the lock ends.
  chain.lastRound = 5000;
  await page.getByTestId("asset-manage-check-again").click();
  await expect(page.locator(".p-toast-message-error")).toContainText(
    "safe to try again",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("asset-manage-unconfirmed")).toHaveCount(0);
});
