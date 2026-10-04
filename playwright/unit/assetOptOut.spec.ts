import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  buildAssetOptOutTxn,
  isAssetNotFoundError,
  resolveOptOutCloseTo,
} from "../../src/scripts/assets/optOut";

const sender = algosdk.generateAccount().addr.toString();
const creator = algosdk.generateAccount().addr.toString();

const suggestedParams: algosdk.SuggestedParams = {
  fee: 1000n,
  flatFee: true,
  firstValid: 100n,
  lastValid: 1100n,
  genesisHash: new Uint8Array(32),
  genesisID: "testnet-v1.0",
  minFee: 1000n,
};

test.describe("resolveOptOutCloseTo", () => {
  test("closes to the asset creator", () => {
    expect(resolveOptOutCloseTo(sender, creator)).toBe(creator);
  });
  test("creator cannot opt out of its own asset", () => {
    expect(resolveOptOutCloseTo(sender, sender)).toBeUndefined();
  });
  test("deleted asset (no creator) closes to the sender", () => {
    expect(resolveOptOutCloseTo(sender, undefined)).toBe(sender);
  });
});

test.describe("buildAssetOptOutTxn", () => {
  test("builds a zero-amount axfer to self closing to the creator", () => {
    const txn = buildAssetOptOutTxn({
      sender,
      assetId: 12345n,
      closeTo: creator,
      suggestedParams,
    });
    expect(txn.type).toBe(algosdk.TransactionType.axfer);
    expect(txn.sender.toString()).toBe(sender);
    expect(txn.assetTransfer?.receiver.toString()).toBe(sender);
    expect(txn.assetTransfer?.amount).toBe(0n);
    expect(txn.assetTransfer?.assetIndex).toBe(12345n);
    expect(txn.assetTransfer?.closeRemainderTo?.toString()).toBe(creator);
    expect(txn.assetTransfer?.assetSender).toBeUndefined();
  });
  test("accepts a numeric/string asset id", () => {
    const txn = buildAssetOptOutTxn({
      sender,
      assetId: "777",
      closeTo: creator,
      suggestedParams,
    });
    expect(txn.assetTransfer?.assetIndex).toBe(777n);
  });
  test("rejects asset id 0 (native token cannot be opted out)", () => {
    expect(() =>
      buildAssetOptOutTxn({ sender, assetId: 0, closeTo: creator, suggestedParams }),
    ).toThrow();
  });
});

test.describe("isAssetNotFoundError", () => {
  test("true only for a 404 status", () => {
    expect(isAssetNotFoundError({ status: 404 })).toBe(true);
    expect(isAssetNotFoundError({ status: 500 })).toBe(false);
    expect(isAssetNotFoundError(new Error("network down"))).toBe(false);
    expect(isAssetNotFoundError(undefined)).toBe(false);
  });
});

test("creator must be confirmed by the indexer (AW-2026-054)", async () => {
  const { confirmAssetCreator } = await import("../../src/scripts/assets/optOut");
  expect(confirmAssetCreator("A", "A")).toBe("A");
  expect(confirmAssetCreator(undefined, undefined)).toBeUndefined();
  expect(() => confirmAssetCreator("A", "B")).toThrow(/disagree/);
  expect(() => confirmAssetCreator("A", undefined)).toThrow(/could not be confirmed/);
});
