// Node-only unit tests for the request transaction-id helper (AW-2026-104/-116).
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import { requestTxIds } from "../../src/scripts/requestSignatures";

const sender = algosdk.generateAccount().addr;
const makeTxn = (amount: bigint) =>
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount,
    suggestedParams: {
      fee: 1000n,
      flatFee: true,
      firstValid: 1n,
      lastValid: 2n,
      genesisID: "testnet-v1.0",
      genesisHash: new Uint8Array(32),
      minFee: 1000n,
    },
  });

test.describe("requestTxIds", () => {
  test("collects the ids of every transaction of every request, once", () => {
    const a = makeTxn(1n);
    const b = makeTxn(2n);
    const ids = requestTxIds([
      { transactions: [{ txn: a }, { txn: b }] },
      { transactions: [{ txn: a }] },
    ]);
    expect(ids.sort()).toEqual([a.txID(), b.txID()].sort());
  });

  test("skips missing requests, empty lists and undecodable transactions", () => {
    const a = makeTxn(1n);
    const broken = {
      txn: {
        txID: () => {
          throw new Error("undecodable");
        },
      },
    };
    expect(
      requestTxIds([undefined, null, {}, { transactions: null }, { transactions: [broken, { txn: a }, undefined] }]),
    ).toEqual([a.txID()]);
  });
});
