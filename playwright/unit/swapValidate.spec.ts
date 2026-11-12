// Node-only unit tests for the swap/aggregator transaction guard (AW-2026-043/-123).
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  assertSwapTransactionSafe,
  assertSwapTransactionsSafe,
} from "../../src/scripts/aggregators/validate";
import { KNOWN_NETWORKS } from "../../src/scripts/direct/networks";

const account = algosdk.generateAccount().addr.toString();
const other = algosdk.generateAccount().addr.toString();
const MAINNET_HASH = Buffer.from(KNOWN_NETWORKS["mainnet-v1.0"].hash, "base64");
const TESTNET_HASH = Buffer.from(KNOWN_NETWORKS["testnet-v1.0"].hash, "base64");

function payment(genesisHash: Buffer, genesisID: string, sender = account) {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: other,
    amount: 1,
    suggestedParams: {
      fee: 1000,
      flatFee: true,
      firstValid: 1000,
      lastValid: 2000,
      genesisHash: new Uint8Array(genesisHash),
      genesisID,
    },
  });
}

test.describe("assertSwapTransactionSafe network binding", () => {
  test("accepts a transaction of the selected network", () => {
    const tx = payment(MAINNET_HASH, "mainnet-v1.0");
    expect(() => assertSwapTransactionSafe(tx, account, "mainnet-v1.0")).not.toThrow();
  });

  test("refuses a transaction built for another network", () => {
    const tx = payment(TESTNET_HASH, "testnet-v1.0");
    expect(() => assertSwapTransactionSafe(tx, account, "mainnet-v1.0")).toThrow(
      /different network/,
    );
    expect(() => assertSwapTransactionsSafe([tx], account, "mainnet-v1.0")).toThrow(
      /different network/,
    );
  });

  test("refuses a foreign hash that claims the selected network's genesis ID", () => {
    const tx = payment(TESTNET_HASH, "mainnet-v1.0");
    expect(() => assertSwapTransactionSafe(tx, account, "mainnet-v1.0")).toThrow(
      /different network/,
    );
  });

  test("without a network the previous checks still apply and the genesis is not compared", () => {
    const tx = payment(TESTNET_HASH, "testnet-v1.0");
    expect(() => assertSwapTransactionSafe(tx, account)).not.toThrow();
    expect(() => assertSwapTransactionSafe(tx, other)).toThrow(/sender/);
  });
});
