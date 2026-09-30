import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import { isRiskyTransaction, isSensitiveAppCall } from "../../src/scripts/arc56/riskTxn";

const a = algosdk.generateAccount().addr;
const b = algosdk.generateAccount().addr;
const suggestedParams = {
  fee: 1000n,
  flatFee: true,
  firstValid: 1n,
  lastValid: 1000n,
  genesisHash: new Uint8Array(32),
  genesisID: "test",
  minFee: 1000n,
};

const pay = (extra: Partial<Parameters<typeof algosdk.makePaymentTxnWithSuggestedParamsFromObject>[0]> = {}) =>
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: a,
    receiver: b,
    amount: 1,
    suggestedParams,
    ...extra,
  });

const call = (
  appIndex: number,
  onComplete: algosdk.OnApplicationComplete = algosdk.OnApplicationComplete.NoOpOC,
) =>
  algosdk.makeApplicationCallTxnFromObject({
    sender: a,
    appIndex,
    onComplete,
    suggestedParams,
    ...(appIndex === 0
      ? { approvalProgram: new Uint8Array([6, 129, 1]), clearProgram: new Uint8Array([6, 129, 1]) }
      : {}),
  });

test.describe("isRiskyTransaction", () => {
  test("plain payment is not risky", () => {
    expect(isRiskyTransaction(pay())).toBe(false);
  });
  test("close-out and rekey away are risky; self rekey is not", () => {
    expect(isRiskyTransaction(pay({ closeRemainderTo: b }))).toBe(true);
    expect(isRiskyTransaction(pay({ rekeyTo: b }))).toBe(true);
    expect(isRiskyTransaction(pay({ rekeyTo: a }))).toBe(false);
  });
  test("asset clawback is risky", () => {
    const tx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: a,
      receiver: a,
      assetSender: b,
      assetIndex: 1,
      amount: 1,
      suggestedParams,
    });
    expect(isRiskyTransaction(tx)).toBe(true);
  });
});

test.describe("isSensitiveAppCall", () => {
  test("plain NoOp on an existing app is not sensitive", () => {
    expect(isSensitiveAppCall(call(123))).toBe(false);
  });
  test("creation, update, delete, clear state and close out are sensitive", () => {
    expect(isSensitiveAppCall(call(0))).toBe(true);
    for (const oc of [
      algosdk.OnApplicationComplete.UpdateApplicationOC,
      algosdk.OnApplicationComplete.DeleteApplicationOC,
      algosdk.OnApplicationComplete.ClearStateOC,
      algosdk.OnApplicationComplete.CloseOutOC,
    ]) {
      expect(isSensitiveAppCall(call(123, oc))).toBe(true);
    }
  });
});
