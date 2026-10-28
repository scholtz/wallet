// Node-only unit tests for the scheduler response checks (AW-2026-085).
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import { assertScheduledTransactionsSafe } from "../../src/scripts/scheduledPaymentTxns";

const owner = algosdk.generateAccount().addr.toString();
const escrow = algosdk.generateAccount().addr.toString();
const other = algosdk.generateAccount().addr.toString();

const suggestedParams = (fee = 1000): algosdk.SuggestedParams => ({
  fee: BigInt(fee),
  flatFee: true,
  firstValid: 1000n,
  lastValid: 2000n,
  genesisID: "testnet-v1.0",
  genesisHash: new Uint8Array(32),
});

const pay = (
  sender: string,
  extra: Partial<Parameters<typeof algosdk.makePaymentTxnWithSuggestedParamsFromObject>[0]> = {},
  fee = 1000,
) =>
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: other,
    amount: 1,
    suggestedParams: suggestedParams(fee),
    ...extra,
  });

test.describe("assertScheduledTransactionsSafe", () => {
  test("accepts ordinary payments of the user and of the escrow", () => {
    expect(() => assertScheduledTransactionsSafe([pay(owner), pay(escrow)], [owner])).not.toThrow();
  });

  test("refuses an empty response", () => {
    expect(() => assertScheduledTransactionsSafe([], [owner])).toThrow(/no transactions/);
  });

  test("refuses a rekey of the user's account", () => {
    expect(() =>
      assertScheduledTransactionsSafe([pay(owner, { rekeyTo: other })], [owner]),
    ).toThrow(/rekey/);
  });

  test("allows a rekey of a sender that is not one of the wallet's accounts", () => {
    expect(() =>
      assertScheduledTransactionsSafe([pay(escrow, { rekeyTo: other })], [owner]),
    ).not.toThrow();
  });

  test("refuses closing the user's ALGO or asset balance", () => {
    expect(() =>
      assertScheduledTransactionsSafe([pay(owner, { closeRemainderTo: other })], [owner]),
    ).toThrow(/close your account/);
    const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: owner,
      receiver: other,
      amount: 1,
      assetIndex: 5,
      closeRemainderTo: other,
      suggestedParams: suggestedParams(),
    });
    expect(() => assertScheduledTransactionsSafe([axfer], [owner])).toThrow(/close an asset/);
  });

  test("refuses a fee above the ceiling on any transaction", () => {
    expect(() => assertScheduledTransactionsSafe([pay(owner, {}, 500_001)], [owner])).toThrow(/fee/);
    expect(() => assertScheduledTransactionsSafe([pay(escrow, {}, 500_001)], [owner])).toThrow(/fee/);
    expect(() => assertScheduledTransactionsSafe([pay(owner, {}, 500_000)], [owner])).not.toThrow();
  });
});
