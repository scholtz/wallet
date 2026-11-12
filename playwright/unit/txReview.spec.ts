// Node-only unit tests for the transaction review helpers (AW-2026-112/-117/-122). Real algosdk v3
// transactions are used on purpose: the audit finding was that the review read flat v2 field names
// (`amount`, `reKeyTo`, ...) that a v3 Transaction does not have.
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  assetAmountLabel,
  describeAccessList,
  describeRejectVersion,
  describeTransfer,
} from "../../src/scripts/txReview";

const sender = algosdk.generateAccount().addr;
const receiver = algosdk.generateAccount().addr;
const clawbackFrom = algosdk.generateAccount().addr;
const suggestedParams = {
  fee: 1000n,
  flatFee: true,
  firstValid: 1000n,
  lastValid: 2000n,
  genesisID: "testnet-v1.0",
  genesisHash: new Uint8Array(32),
  minFee: 1000n,
};

test.describe("describeTransfer", () => {
  test("a v3 payment has no flat amount, but its amount and receiver are described", () => {
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver,
      amount: 5_000_000n,
      suggestedParams,
    });
    expect("amount" in txn).toBe(false);
    expect(describeTransfer(txn)).toEqual({
      amount: 5_000_000n,
      receiver: receiver.toString(),
    });
  });

  test("an asset transfer exposes the asset id, amount and receiver", () => {
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver,
      assetIndex: 31566704n,
      amount: 7n,
      suggestedParams,
    });
    expect(describeTransfer(txn)).toEqual({
      assetId: "31566704",
      amount: 7n,
      receiver: receiver.toString(),
      assetSender: undefined,
    });
  });

  test("a clawback names the account the asset is taken from", () => {
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver,
      assetIndex: 5n,
      amount: 1n,
      assetSender: clawbackFrom,
      suggestedParams,
    });
    expect(describeTransfer(txn)?.assetSender).toBe(clawbackFrom.toString());
  });

  test("the description survives an encode/decode round trip (the /sign deep-link path)", () => {
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver,
      amount: 123n,
      suggestedParams,
    });
    const decoded = algosdk.decodeUnsignedTransaction(algosdk.encodeUnsignedTransaction(txn));
    expect(describeTransfer(decoded)).toEqual({ amount: 123n, receiver: receiver.toString() });
  });

  test("other transaction types move nothing", () => {
    expect(describeTransfer({ type: "appl" })).toBeUndefined();
    expect(describeTransfer(undefined)).toBeUndefined();
  });

  test("a base-unit amount above 2^53 is kept exactly", () => {
    const amount = 9_007_199_254_740_993n;
    expect(describeTransfer({ type: "pay", payment: { amount } })?.amount).toBe(amount);
  });
});

test.describe("assetAmountLabel", () => {
  test("without metadata the amount is raw base units under the asset id, never the native token", () => {
    const label = assetAmountLabel("31566704", 1n);
    expect(label).toEqual({ text: "1 (asset 31566704, base units)", known: false });
    expect(label.text).not.toContain("Algo");
  });

  test("metadata without decimals is treated as unknown", () => {
    expect(assetAmountLabel("5", 10n, { name: "X" }).known).toBe(false);
  });

  test("with metadata the amount is scaled exactly", () => {
    expect(assetAmountLabel("5", 1_234_567n, { name: "USDC", decimals: 6 })).toEqual({
      text: "1.234567 USDC (asset 5)",
      known: true,
    });
    expect(assetAmountLabel("5", 3n, { decimals: 0 }).text).toBe("3 (asset 5)");
  });
});

test.describe("application call resource references", () => {
  const holder = algosdk.generateAccount().addr;

  test("the access list and the reject version are described", () => {
    const txn = algosdk.makeApplicationCallTxnFromObject({
      sender,
      appIndex: 99n,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      access: [
        { address: holder },
        { appIndex: 7n },
        { assetIndex: 8n },
        { holding: { assetIndex: 8n, address: holder } },
        { locals: { appIndex: 7n, address: holder } },
        { box: { appIndex: 7n, name: new Uint8Array([1, 2]) } },
      ],
      rejectVersion: 3,
      suggestedParams,
    });
    const lines = describeAccessList(txn);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    const joined = lines.join("\n");
    expect(joined).toContain(`account: ${holder.toString()}`);
    expect(joined).toContain("app: 7");
    expect(joined).toContain("asset: 8");
    expect(joined).toContain("holding: asset 8");
    expect(joined).toContain("local state: app 7");
    expect(joined).toContain("box: app 7, name 0x0102");
    expect(describeRejectVersion(txn)).toBe(3);
  });

  test("a holding of the implicit sender is not shown as the zero address", () => {
    const txn = algosdk.makeApplicationCallTxnFromObject({
      sender,
      appIndex: 99n,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      access: [{ holding: { assetIndex: 8n, address: new algosdk.Address(new Uint8Array(32)) } }],
      suggestedParams,
    });
    const joined = describeAccessList(txn).join(", ");
    expect(joined).toContain("holding: asset 8 of sender");
    expect(joined).not.toContain("AAAAAAAA");
  });

  test("a call without references shows nothing", () => {
    const txn = algosdk.makeApplicationCallTxnFromObject({
      sender,
      appIndex: 99n,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      suggestedParams,
    });
    expect(describeAccessList(txn)).toEqual([]);
    expect(describeRejectVersion(txn)).toBeUndefined();
  });
});
