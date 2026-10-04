import { test, expect, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { setupFreshWallet } from "../support/wallet";

const ASSET_ID = 31566704;
const MAINNET_GENESIS_HASH = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";

interface OptOutMock {
  /** creator reported by the algod node */
  nodeCreator: string;
  /** creator reported by the indexer */
  indexerCreator: string;
}

/**
 * Mocked chain: the account holds ALGO and 3 units of one ASA. algod and the indexer share the
 * `/v2/assets/<id>` path, so one response carries both shapes (`params` for algod, `asset` for
 * the indexer) with independently chosen creators.
 */
async function mockChain(page: Page, mock: OptOutMock) {
  const state = { submitted: null as Buffer | null };
  const assetParams = (creator: string) => ({
    creator,
    decimals: 6,
    total: 1_000_000_000,
    "default-frozen": false,
    name: "USDC",
    "unit-name": "USDC",
  });
  await page.route(new RegExp(`/v2/assets/${ASSET_ID}$`), (route) =>
    route.fulfill({
      json: {
        "current-round": 100,
        index: ASSET_ID,
        params: assetParams(mock.nodeCreator),
        asset: { index: ASSET_ID, params: assetParams(mock.indexerCreator) },
      },
    }),
  );
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
          "total-assets-opted-in": 1,
          "total-created-apps": 0,
          "total-created-assets": 0,
          assets: [
            { "asset-id": ASSET_ID, amount: 3_000_000, "is-frozen": false },
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
        "genesis-hash": MAINNET_GENESIS_HASH,
        "genesis-id": "mainnet-v1.0",
        "last-round": 100,
        "min-fee": 1000,
      },
    }),
  );
  await page.route(/\/v2\/transactions$/, (route) => {
    state.submitted = route.request().postDataBuffer();
    return route.fulfill({ json: { txId: "OPTOUTTXID" } });
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
          txn: algosdk.msgpackRawDecode(state.submitted ?? Buffer.alloc(0)),
        }),
      ),
    }),
  );
  return state;
}

/** In-app route change (history + popstate) - a page.goto would lock the wallet. */
async function openAssets(page: Page, addr: string) {
  await page.evaluate(
    ([id, to]) => {
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
      history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [ASSET_ID, `/account/assets/${addr}`] as const,
  );
}

test("opt-out shows where the remaining balance goes and sends it to the confirmed creator", async ({
  page,
}) => {
  test.setTimeout(180000);
  const creator = algosdk.generateAccount().addr.toString();
  const chain = await mockChain(page, {
    nodeCreator: creator,
    indexerCreator: creator,
  });
  await setupFreshWallet(page);
  const addr = page.url().match(/\/account\/([A-Z2-7]{58})/)?.[1] ?? "";
  await openAssets(page, addr);

  const optOut = page.locator('button[title="Opt out of asset"]').first();
  await expect(optOut).toBeVisible({ timeout: 30000 });
  await optOut.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The close-to address is shown in full before the user confirms.
  await expect(dialog.locator("code")).toHaveText(creator);

  await dialog.getByRole("button", { name: "Opt out" }).click();
  await expect(page.locator(".p-toast-message-success").first()).toBeVisible({
    timeout: 30000,
  });
  expect(chain.submitted).not.toBeNull();
  // The submitted transaction closes the asset holding to the creator.
  const decoded = algosdk.decodeSignedTransaction(
    new Uint8Array(chain.submitted as Buffer),
  );
  expect(decoded.txn.assetTransfer?.closeRemainderTo?.toString()).toBe(creator);
});

test("opt-out is refused when the node and the indexer disagree about the creator", async ({
  page,
}) => {
  test.setTimeout(180000);
  const chain = await mockChain(page, {
    nodeCreator: algosdk.generateAccount().addr.toString(),
    indexerCreator: algosdk.generateAccount().addr.toString(),
  });
  await setupFreshWallet(page);
  const addr = page.url().match(/\/account\/([A-Z2-7]{58})/)?.[1] ?? "";
  await openAssets(page, addr);

  const optOut = page.locator('button[title="Opt out of asset"]').first();
  await expect(optOut).toBeVisible({ timeout: 30000 });
  await optOut.click();

  await expect(page.locator(".p-toast-message-error").first()).toContainText(
    "disagree",
    { timeout: 30000 },
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(chain.submitted).toBeNull();
});
