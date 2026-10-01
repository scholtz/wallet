import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  ONE_14_DP,
  calcFAssetReceived,
  calcFolksLendReceived,
  calcUnderlyingReceived,
  exchangeRate,
  fromBaseUnits,
  toBaseUnits,
} from "../../src/scripts/folksLend/convert";
import {
  FOLKS_USDC_POOL,
  assertFolksLendTxnsSafe,
  buildFolksLendTxns,
  isFolksLendNetwork,
} from "../../src/scripts/folksLend/transactions";

const sender = algosdk.generateAccount().addr.toString();
const attacker = algosdk.generateAccount().addr.toString();

const suggestedParams: algosdk.SuggestedParams = {
  fee: 1000n,
  flatFee: true,
  firstValid: 100n,
  lastValid: 1100n,
  genesisHash: new Uint8Array(32),
  genesisID: "mainnet-v1.0",
  minFee: 1000n,
};

test.describe("fToken maths", () => {
  test("index 1.0 converts 1:1", () => {
    expect(calcFAssetReceived(1_000_000n, ONE_14_DP)).toBe(1_000_000n);
    expect(calcUnderlyingReceived(1_000_000n, ONE_14_DP)).toBe(1_000_000n);
  });
  test("index 1.25 gives fewer fTokens and more USDC back", () => {
    const index = (ONE_14_DP * 125n) / 100n;
    expect(calcFAssetReceived(1_250_000n, index)).toBe(1_000_000n);
    expect(calcUnderlyingReceived(1_000_000n, index)).toBe(1_250_000n);
  });
  test("results floor, a round trip never returns more than was deposited", () => {
    const index = ONE_14_DP + 12345678901n;
    for (const amount of [1n, 7n, 999_999n, 123_456_789n]) {
      const f = calcFAssetReceived(amount, index);
      expect(calcUnderlyingReceived(f, index) <= amount).toBe(true);
    }
  });
  test("direction dispatch", () => {
    const index = (ONE_14_DP * 2n);
    expect(calcFolksLendReceived("deposit", 100n, index)).toBe(50n);
    expect(calcFolksLendReceived("withdraw", 100n, index)).toBe(200n);
  });
  test("rejects a non-positive index", () => {
    expect(() => calcFAssetReceived(1n, 0n)).toThrow();
    expect(() => calcUnderlyingReceived(1n, -1n)).toThrow();
  });
  test("exchangeRate", () => {
    expect(exchangeRate((ONE_14_DP * 105n) / 100n)).toBeCloseTo(1.05, 10);
  });
});

test.describe("base unit conversion", () => {
  test("avoids float artefacts", () => {
    expect(toBaseUnits(0.1 + 0.2, 6)).toBe(300000n);
    expect(toBaseUnits(1.234567, 6)).toBe(1234567n);
    expect(toBaseUnits(12, 6)).toBe(12000000n);
  });
  test("invalid or non-positive input is zero", () => {
    expect(toBaseUnits(0, 6)).toBe(0n);
    expect(toBaseUnits(-5, 6)).toBe(0n);
    expect(toBaseUnits(NaN, 6)).toBe(0n);
    expect(toBaseUnits(Infinity, 6)).toBe(0n);
  });
  test("fromBaseUnits", () => {
    expect(fromBaseUnits(1500000n, 6)).toBe(1.5);
  });
});

test.describe("network gate", () => {
  test("mainnet only", () => {
    expect(isFolksLendNetwork("mainnet-v1.0")).toBe(true);
    expect(isFolksLendNetwork("mainnet")).toBe(true);
    expect(isFolksLendNetwork("testnet-v1.0")).toBe(false);
    expect(isFolksLendNetwork("custom")).toBe(false);
  });
});

test.describe("transaction building", () => {
  const poolAddr = algosdk
    .getApplicationAddress(FOLKS_USDC_POOL.appId)
    .toString();

  test("deposit without opt-in: grouped USDC transfer + pool app call", () => {
    const txns = buildFolksLendTxns({
      direction: "deposit",
      sender,
      amount: 5_000_000n,
      suggestedParams,
    });
    expect(txns).toHaveLength(2);
    expect(txns[0].type).toBe(algosdk.TransactionType.axfer);
    expect(txns[0].assetTransfer?.assetIndex).toBe(
      BigInt(FOLKS_USDC_POOL.assetId),
    );
    expect(txns[0].assetTransfer?.receiver.toString()).toBe(poolAddr);
    expect(txns[0].assetTransfer?.amount).toBe(5_000_000n);
    expect(txns[1].type).toBe(algosdk.TransactionType.appl);
    expect(txns[1].applicationCall?.appIndex).toBe(
      BigInt(FOLKS_USDC_POOL.appId),
    );
    expect(txns[0].group).toBeDefined();
    expect(txns[0].group).toEqual(txns[1].group);
    expect(() => assertFolksLendTxnsSafe(txns, sender)).not.toThrow();
  });

  test("deposit with opt-in prepends a zero-amount fUSDC self transfer", () => {
    const txns = buildFolksLendTxns({
      direction: "deposit",
      sender,
      amount: 1_000_000n,
      optInAssetId: FOLKS_USDC_POOL.fAssetId,
      suggestedParams,
    });
    expect(txns).toHaveLength(3);
    expect(txns[0].assetTransfer?.assetIndex).toBe(
      BigInt(FOLKS_USDC_POOL.fAssetId),
    );
    expect(txns[0].assetTransfer?.amount).toBe(0n);
    expect(txns[0].assetTransfer?.receiver.toString()).toBe(sender);
    expect(() => assertFolksLendTxnsSafe(txns, sender)).not.toThrow();
  });

  test("withdraw sends fUSDC to the pool", () => {
    const txns = buildFolksLendTxns({
      direction: "withdraw",
      sender,
      amount: 2_000_000n,
      suggestedParams,
    });
    expect(txns).toHaveLength(2);
    expect(txns[0].assetTransfer?.assetIndex).toBe(
      BigInt(FOLKS_USDC_POOL.fAssetId),
    );
    expect(txns[0].assetTransfer?.receiver.toString()).toBe(poolAddr);
    // received_amount = 0 ("variable"): the pool pays whatever the fUSDC is
    // worth on-chain instead of a client-estimated amount.
    expect(txns[1].applicationCall?.appArgs[1]).toEqual(new Uint8Array(8));
    expect(() => assertFolksLendTxnsSafe(txns, sender)).not.toThrow();
  });

  test("withdraw opts in to USDC first when it is not held", () => {
    const txns = buildFolksLendTxns({
      direction: "withdraw",
      sender,
      amount: 2_000_000n,
      optInAssetId: FOLKS_USDC_POOL.assetId,
      suggestedParams,
    });
    expect(txns).toHaveLength(3);
    expect(txns[0].assetTransfer?.assetIndex).toBe(
      BigInt(FOLKS_USDC_POOL.assetId),
    );
    expect(txns[0].assetTransfer?.amount).toBe(0n);
    expect(txns[0].assetTransfer?.receiver.toString()).toBe(sender);
    expect(() => assertFolksLendTxnsSafe(txns, sender)).not.toThrow();
  });

  test("safety check rejects foreign senders, receivers, apps and assets", () => {
    const good = buildFolksLendTxns({
      direction: "deposit",
      sender,
      amount: 1n,
      suggestedParams,
    });
    // wrong connected account
    expect(() => assertFolksLendTxnsSafe(good, attacker)).toThrow();
    // asset sent to an attacker instead of the pool
    const drain = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: attacker,
      assetIndex: FOLKS_USDC_POOL.assetId,
      amount: 1n,
      suggestedParams,
    });
    expect(() => assertFolksLendTxnsSafe([drain], sender)).toThrow(
      /unexpected asset transfer/,
    );
    // unrelated asset to the pool
    const wrongAsset =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender,
        receiver: poolAddr,
        assetIndex: 312769,
        amount: 1n,
        suggestedParams,
      });
    expect(() => assertFolksLendTxnsSafe([wrongAsset], sender)).toThrow();
    // call to another application
    const otherApp = algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      appIndex: 1234,
      suggestedParams,
    });
    expect(() => assertFolksLendTxnsSafe([otherApp], sender)).toThrow(
      /unexpected application call/,
    );
    // ALGO payment is not part of this flow
    const pay = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: attacker,
      amount: 1n,
      suggestedParams,
    });
    expect(() => assertFolksLendTxnsSafe([pay], sender)).toThrow();
    // rekey piggy-backed on an allowed transaction
    const rekey = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: sender,
      assetIndex: FOLKS_USDC_POOL.fAssetId,
      amount: 0n,
      rekeyTo: attacker,
      suggestedParams,
    });
    expect(() => assertFolksLendTxnsSafe([rekey], sender)).toThrow(/rekey/);
  });
});
