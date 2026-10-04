import { test, expect, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { setupFreshWallet } from "../support/wallet";
import {
  currentAccountAddress,
  mockAccount,
  mockAlgod,
  navigateInApp,
  seedAssetCache,
  type AlgodMockOptions,
} from "../support/chain";

const ASSET_ID = 31566704;

interface OptOutMock extends AlgodMockOptions {
  /** creator reported by the algod node */
  nodeCreator: string;
  /** creator reported by the indexer (undefined: the indexer does not know the asset) */
  indexerCreator?: string;
}

/**
 * Mocked chain: the account holds ALGO and 3 units of one ASA. algod and the indexer share the
 * `/v2/assets/<id>` path, so one response carries both shapes (`params` for algod, `asset` for
 * the indexer) with independently chosen creators.
 */
async function mockChain(page: Page, mock: OptOutMock) {
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
        ...(mock.indexerCreator
          ? { asset: { index: ASSET_ID, params: assetParams(mock.indexerCreator) } }
          : {}),
      },
    }),
  );
  await mockAccount(page, { assets: [{ assetId: ASSET_ID, amount: 3_000_000 }] });
  return mockAlgod(page, mock);
}

/** Fresh wallet on the mocked chain, then the account's asset list. */
async function openAssets(page: Page) {
  await setupFreshWallet(page);
  const addr = currentAccountAddress(page);
  await seedAssetCache(page, [{ assetId: ASSET_ID, name: "USDC" }]);
  await navigateInApp(page, `/account/assets/${addr}`);
  const optOut = page.locator('button[title="Opt out of asset"]').first();
  await expect(optOut).toBeVisible({ timeout: 30000 });
  return optOut;
}

const randomAddress = () => algosdk.generateAccount().addr.toString();

test("opt-out shows where the remaining balance goes and sends it to the confirmed creator", async ({
  page,
}) => {
  test.setTimeout(180000);
  const creator = randomAddress();
  const chain = await mockChain(page, { nodeCreator: creator, indexerCreator: creator });
  await (await openAssets(page)).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The close-to address is shown in full before the user confirms.
  await expect(dialog.locator("code")).toHaveText(creator);

  await dialog.getByRole("button", { name: "Opt out" }).click();
  await expect(page.locator(".p-toast-message-success").first()).toBeVisible({
    timeout: 30000,
  });
  // The submitted transaction closes the asset holding to the creator, with a normal fee.
  const sent = chain.submittedTransaction();
  expect(sent?.txn.assetTransfer?.closeRemainderTo?.toString()).toBe(creator);
  expect(sent?.txn.fee).toBeLessThanOrEqual(2000n);
});

test("cancelling the dialog sends nothing", async ({ page }) => {
  test.setTimeout(180000);
  const creator = randomAddress();
  const chain = await mockChain(page, { nodeCreator: creator, indexerCreator: creator });
  await (await openAssets(page)).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  expect(chain.submittedTransaction()).toBeNull();
});

test("opt-out is refused when the node and the indexer disagree about the creator", async ({
  page,
}) => {
  test.setTimeout(180000);
  const chain = await mockChain(page, {
    nodeCreator: randomAddress(),
    indexerCreator: randomAddress(),
  });
  await (await openAssets(page)).click();

  await expect(page.locator(".p-toast-message-error").first()).toContainText("disagree", {
    timeout: 30000,
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(chain.submittedTransaction()).toBeNull();
});

test("opt-out is refused when the indexer cannot confirm the creator", async ({ page }) => {
  test.setTimeout(180000);
  const chain = await mockChain(page, { nodeCreator: randomAddress() });
  await (await openAssets(page)).click();

  await expect(page.locator(".p-toast-message-error").first()).toContainText(
    "could not be confirmed",
    { timeout: 30000 },
  );
  expect(chain.submittedTransaction()).toBeNull();
});

test("opt-out is refused when the node reports another network's genesis", async ({ page }) => {
  test.setTimeout(180000);
  const creator = randomAddress();
  const chain = await mockChain(page, {
    nodeCreator: creator,
    indexerCreator: creator,
    genesisId: "testnet-v1.0",
    genesisHash: Buffer.alloc(32, 7).toString("base64"),
  });
  await (await openAssets(page)).click();
  await page.getByRole("dialog").getByRole("button", { name: "Opt out" }).click();

  await expect(page.locator(".p-toast-message-error").first()).toContainText("genesis", {
    timeout: 30000,
  });
  expect(chain.submittedTransaction()).toBeNull();
});

test("opt-out is refused when the node suggests an abnormal fee", async ({ page }) => {
  test.setTimeout(180000);
  const creator = randomAddress();
  const chain = await mockChain(page, {
    nodeCreator: creator,
    indexerCreator: creator,
    fee: 100_000,
  });
  await (await openAssets(page)).click();
  await page.getByRole("dialog").getByRole("button", { name: "Opt out" }).click();

  await expect(page.locator(".p-toast-message-error").first()).toContainText("fee", {
    timeout: 30000,
  });
  expect(chain.submittedTransaction()).toBeNull();
});
