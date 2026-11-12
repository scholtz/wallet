// Node-only unit tests for the ARC-14 realm guard (AW-2026-087).
import { test, expect } from "@playwright/test";
import {
  assertRemoteArc14Realm,
  isReservedArc14Realm,
} from "../../src/scripts/encoding/arc14";

test.describe("isReservedArc14Realm", () => {
  test("recognises the realms the wallet uses for its own services", () => {
    expect(isReservedArc14Realm("BiatecRouter#ARC14")).toBe(true);
    expect(isReservedArc14Realm("BiatecScan#ARC14")).toBe(true);
  });

  test("ignores case, whitespace and a missing marker", () => {
    expect(isReservedArc14Realm("  biatecrouter#arc14 ")).toBe(true);
    expect(isReservedArc14Realm("BiatecRouter")).toBe(true);
  });

  test("other realms and non-strings are not reserved", () => {
    expect(isReservedArc14Realm("BiatecParticipation#ARC14")).toBe(false);
    expect(isReservedArc14Realm("")).toBe(false);
    expect(isReservedArc14Realm(undefined)).toBe(false);
    expect(isReservedArc14Realm({ realm: "BiatecRouter#ARC14" })).toBe(false);
  });
});

test.describe("assertRemoteArc14Realm", () => {
  test("passes an ordinary realm through unchanged", () => {
    expect(assertRemoteArc14Realm("Participation#ARC14")).toBe("Participation#ARC14");
  });

  test("refuses a remote host that answers with another service's realm", () => {
    expect(() => assertRemoteArc14Realm("BiatecRouter#ARC14")).toThrow(/another service/);
  });
});

// AW-2026-101: the "just a login" shortcut must never apply to a transaction that burns a fee.
import algosdk from "algosdk";
import {
  ARC14_MAX_FEE_MICROALGOS,
  isArc14AuthTransaction,
} from "../../src/scripts/encoding/arc14";

const makeSelfPay = (fee: number, note = "Service#ARC14") => {
  const acc = algosdk.generateAccount();
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: acc.addr,
    receiver: acc.addr,
    amount: 0,
    note: new TextEncoder().encode(note),
    suggestedParams: {
      fee,
      flatFee: true,
      firstValid: 1000,
      lastValid: 2000,
      genesisHash: new Uint8Array(32),
      genesisID: "testnet-v1.0",
      minFee: 1000,
    },
  });
};

test.describe("isArc14AuthTransaction fee check", () => {
  test("accepts a zero-fee and a minimum-fee login", () => {
    expect(isArc14AuthTransaction(makeSelfPay(0))).toBe(true);
    expect(isArc14AuthTransaction(makeSelfPay(Number(ARC14_MAX_FEE_MICROALGOS)))).toBe(true);
  });

  test("refuses a self-payment whose fee exceeds the minimum fee", () => {
    expect(isArc14AuthTransaction(makeSelfPay(Number(ARC14_MAX_FEE_MICROALGOS) + 1))).toBe(false);
    expect(isArc14AuthTransaction(makeSelfPay(5_000_000))).toBe(false);
  });

  test("still refuses a note without the ARC14 marker", () => {
    expect(isArc14AuthTransaction(makeSelfPay(0, "hello"))).toBe(false);
  });
});

test.describe("isArc14AuthTransaction robustness", () => {
  test("a non-integer fee is never a login and never throws", () => {
    const txn = makeSelfPay(0);
    const fractional = Object.assign(Object.create(Object.getPrototypeOf(txn)), txn, { fee: 1.5 });
    expect(() => isArc14AuthTransaction(fractional)).not.toThrow();
    expect(isArc14AuthTransaction(fractional)).toBe(false);
  });
});
