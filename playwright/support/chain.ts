import { expect, type Page } from "@playwright/test";
import algosdk from "algosdk";

/** Genesis hash of Algorand mainnet (the default network of a fresh wallet). */
export const MAINNET_GENESIS_HASH = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";

export interface MockedAsset {
  assetId: number;
  amount: number;
}

export interface MockedAccount {
  /** microAlgo balance (default 5 ALGO). */
  algo?: number;
  assets?: MockedAsset[];
}

/**
 * Answers every `/v2/accounts/<addr>` lookup (algod and indexer share the path) with the same
 * holdings. Install before the wallet exists so no real mainnet lookup can overwrite them.
 */
export async function mockAccount(page: Page, account: MockedAccount = {}) {
  const algo = account.algo ?? 5_000_000;
  const assets = account.assets ?? [];
  await page.route(/\/v2\/accounts\/[A-Z2-7]{58}/, (route) => {
    const address = new URL(route.request().url()).pathname.split("/v2/accounts/")[1];
    return route.fulfill({
      json: {
        "current-round": 100,
        account: {
          address,
          amount: algo,
          "amount-without-pending-rewards": algo,
          "min-balance": 200_000,
          "pending-rewards": 0,
          rewards: 0,
          round: 100,
          status: "Offline",
          "total-apps-opted-in": 0,
          "total-assets-opted-in": assets.length,
          "total-created-apps": 0,
          "total-created-assets": 0,
          assets: assets.map((a) => ({
            "asset-id": a.assetId,
            amount: a.amount,
            "is-frozen": false,
          })),
        },
      },
    });
  });
}

export interface AlgodMockOptions {
  /** Genesis hash the node reports (default: mainnet's). */
  genesisHash?: string;
  /** Genesis id the node reports (default: mainnet-v1.0). */
  genesisId?: string;
  /** Per-byte fee the node suggests (default 0, like a real network). */
  fee?: number;
  /** Respond to submitted transactions with an error. */
  rejectSend?: boolean;
}

/**
 * Minimal algod: suggested params, status, transaction submission and confirmation. Records
 * the submitted transaction so a test can inspect exactly what the wallet signed.
 */
export async function mockAlgod(page: Page, options: AlgodMockOptions = {}) {
  const state = { submitted: null as Buffer | null };
  await page.route(/\/v2\/transactions\/params/, (route) =>
    route.fulfill({
      json: {
        "consensus-version": "future",
        fee: options.fee ?? 0,
        "genesis-hash": options.genesisHash ?? MAINNET_GENESIS_HASH,
        "genesis-id": options.genesisId ?? "mainnet-v1.0",
        "last-round": 100,
        "min-fee": 1000,
      },
    }),
  );
  await page.route(/\/v2\/transactions$/, (route) => {
    if (options.rejectSend) {
      return route.fulfill({
        status: 400,
        json: { message: "TransactionPool.Remember: transaction rejected" },
      });
    }
    state.submitted = route.request().postDataBuffer();
    return route.fulfill({ json: { txId: "TESTTXID" } });
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
  return {
    /** The last submitted signed transaction, decoded (null if nothing was submitted). */
    submittedTransaction: () =>
      state.submitted
        ? algosdk.decodeSignedTransaction(new Uint8Array(state.submitted))
        : null,
  };
}

/** Address of the account whose overview page the wallet is currently on. */
export function currentAccountAddress(page: Page): string {
  const address = page.url().match(/\/account\/([A-Z2-7]{58})/)?.[1];
  expect(address, `no account address in ${page.url()}`).toBeTruthy();
  return address as string;
}

/** In-app route change (history + popstate): a page.goto would lock the wallet. */
export async function navigateInApp(page: Page, path: string) {
  await page.evaluate((to) => {
    history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

/** The store reads its localStorage asset cache first; seed it so names resolve offline. */
export async function seedAssetCache(
  page: Page,
  assets: { assetId: number; name: string; decimals?: number }[],
) {
  await page.evaluate((list) => {
    for (const a of list) {
      localStorage.setItem(
        `Asset-${a.assetId}`,
        JSON.stringify({
          assetId: String(a.assetId),
          name: a.name,
          label: a.name,
          unitName: a.name,
          decimals: a.decimals ?? 6,
          type: "ASA",
        }),
      );
    }
  }, assets);
}
