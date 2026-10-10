// Node-only unit tests for the application-call review model of the Biatec Direct popup:
// create / update / delete of a smart contract are signable, and the popup can describe them.
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import { createHash } from "node:crypto";
import { PROGRAM_PREVIEW_BYTES, describeApplicationCall, isLifecycle } from "../../src/scripts/direct/appCall";
import { directUnsupportedReason } from "../../src/scripts/direct/protocol";

const sender = algosdk.generateAccount().addr.toString();
const params = {
  fee: 1000,
  flatFee: true,
  firstValid: 1000,
  lastValid: 2000,
  genesisHash: new Uint8Array(32).fill(7),
  genesisID: "test-v1",
};
const APPROVAL = new Uint8Array([0x0a, 0x81, 0x01, 0x43]); // #pragma version 10; int 1; return
const CLEAR = new Uint8Array([0x0a, 0x81, 0x01, 0x43]);
const sha256Hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const create = (extra: Partial<Parameters<typeof algosdk.makeApplicationCreateTxnFromObject>[0]> = {}) =>
  algosdk.makeApplicationCreateTxnFromObject({
    sender,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: APPROVAL,
    clearProgram: CLEAR,
    numGlobalInts: 2,
    numGlobalByteSlices: 3,
    numLocalInts: 1,
    numLocalByteSlices: 4,
    extraPages: 1,
    ...extra,
  });

const call = (onComplete: algosdk.OnApplicationComplete, appIndex = 1234) => {
  const base = { sender, suggestedParams: params, appIndex };
  switch (onComplete) {
    case algosdk.OnApplicationComplete.UpdateApplicationOC:
      return algosdk.makeApplicationUpdateTxnFromObject({
        ...base,
        approvalProgram: APPROVAL,
        clearProgram: CLEAR,
      });
    case algosdk.OnApplicationComplete.DeleteApplicationOC:
      return algosdk.makeApplicationDeleteTxnFromObject(base);
    case algosdk.OnApplicationComplete.CloseOutOC:
      return algosdk.makeApplicationCloseOutTxnFromObject(base);
    case algosdk.OnApplicationComplete.ClearStateOC:
      return algosdk.makeApplicationClearStateTxnFromObject(base);
    case algosdk.OnApplicationComplete.OptInOC:
      return algosdk.makeApplicationOptInTxnFromObject(base);
    default:
      return algosdk.makeApplicationNoOpTxnFromObject(base);
  }
};

test.describe("directUnsupportedReason: the application lifecycle is signable", () => {
  test("application creation is allowed", () => {
    expect(directUnsupportedReason(create())).toBeUndefined();
  });

  test("application update and delete are allowed", () => {
    expect(directUnsupportedReason(call(algosdk.OnApplicationComplete.UpdateApplicationOC))).toBeUndefined();
    expect(directUnsupportedReason(call(algosdk.OnApplicationComplete.DeleteApplicationOC))).toBeUndefined();
  });

  test("calls, opt-in, close-out and clear-state stay allowed", () => {
    for (const oc of [
      algosdk.OnApplicationComplete.NoOpOC,
      algosdk.OnApplicationComplete.OptInOC,
      algosdk.OnApplicationComplete.CloseOutOC,
      algosdk.OnApplicationComplete.ClearStateOC,
    ]) {
      expect(directUnsupportedReason(call(oc))).toBeUndefined();
    }
  });

  test("types the popup still cannot show are refused", () => {
    expect(directUnsupportedReason({ type: "keyreg" })).toMatch(/not supported/);
    expect(directUnsupportedReason({ type: "acfg" })).toMatch(/not supported/);
  });

  test("program bytes on a call that is not a create or an update are refused", () => {
    expect(
      directUnsupportedReason({
        type: "appl",
        applicationCall: { appIndex: 9n, onComplete: 0, approvalProgram: new Uint8Array([1]) },
      }),
    ).toMatch(/not supported/);
    expect(
      directUnsupportedReason({
        type: "appl",
        applicationCall: { appIndex: 9n, onComplete: 5, clearProgram: new Uint8Array([1]) },
      }),
    ).toMatch(/not supported/);
  });

  test("a creation with a ClearState or CloseOut OnComplete is refused (invalid on chain)", () => {
    for (const onComplete of [2, 3]) {
      expect(
        directUnsupportedReason({ type: "appl", applicationCall: { appIndex: 0n, onComplete } }),
      ).toMatch(/not supported/);
    }
    expect(
      directUnsupportedReason({ type: "appl", applicationCall: { appIndex: 0n, onComplete: 1 } }),
    ).toBeUndefined();
  });

  test("a program above the AVM limit (4 pages x 2048 bytes) is refused before anything is hashed", () => {
    const tooBig = new Uint8Array(8193);
    expect(directUnsupportedReason(create({ approvalProgram: tooBig, extraPages: 3 }))).toMatch(/not supported/);
    expect(directUnsupportedReason(create({ clearProgram: tooBig, extraPages: 3 }))).toMatch(/not supported/);
    expect(
      directUnsupportedReason(create({ approvalProgram: new Uint8Array(8188), extraPages: 3 })),
    ).toBeUndefined();
  });

  test("programs that do not fit the declared pages are refused", () => {
    // 1 page = 2048 bytes for approval + clear together; each extra page adds 2048 (max 3).
    expect(
      directUnsupportedReason(
        create({ approvalProgram: new Uint8Array(1500), clearProgram: new Uint8Array(1500), extraPages: 0 }),
      ),
    ).toMatch(/not supported/);
    expect(
      directUnsupportedReason(
        create({ approvalProgram: new Uint8Array(1500), clearProgram: new Uint8Array(1500), extraPages: 1 }),
      ),
    ).toBeUndefined();
  });

  test("an update may carry a program larger than one page (extra pages belong to the app, not the update)", () => {
    const big = new Uint8Array(6000).fill(0x0a);
    expect(
      directUnsupportedReason(
        algosdk.makeApplicationUpdateTxnFromObject({
          sender,
          suggestedParams: params,
          appIndex: 77,
          approvalProgram: big,
          clearProgram: CLEAR,
        }),
      ),
    ).toBeUndefined();
  });

  test("an update above the absolute maximum is refused", () => {
    expect(
      directUnsupportedReason(
        algosdk.makeApplicationUpdateTxnFromObject({
          sender,
          suggestedParams: params,
          appIndex: 77,
          approvalProgram: new Uint8Array(9000),
          clearProgram: CLEAR,
        }),
      ),
    ).toMatch(/not supported/);
  });

  test("extra pages on an update or a call are refused (data the popup does not show)", () => {
    expect(
      directUnsupportedReason({
        type: "appl",
        applicationCall: { appIndex: 9n, onComplete: 0, extraPages: 1 },
      }),
    ).toMatch(/not supported/);
  });

  test("more than three extra pages are refused", () => {
    expect(directUnsupportedReason(create({ extraPages: 4 }))).toMatch(/not supported/);
    expect(directUnsupportedReason(create({ extraPages: 3 }))).toBeUndefined();
  });

  test("an unknown OnComplete value is refused", () => {
    expect(
      directUnsupportedReason({ type: "appl", applicationCall: { appIndex: 9n, onComplete: 9 } }),
    ).toMatch(/not supported/);
  });

  test("an application transaction without a call body is refused", () => {
    expect(directUnsupportedReason({ type: "appl" })).toMatch(/not supported/);
  });
});

test.describe("describeApplicationCall", () => {
  test("a creation is a high-impact create with program, hash and schema", () => {
    const summary = describeApplicationCall(create())!;
    expect(summary.kind).toBe("create");
    expect(summary.risk).toBe("high");
    expect(summary.appIndex).toBe(0);
    expect(summary.approval).toEqual({
      size: APPROVAL.length,
      sha256: sha256Hex(APPROVAL),
      hex: "0a810143",
      address: new algosdk.LogicSigAccount(APPROVAL).address().toString(),
    });
    expect(summary.clear?.sha256).toBe(sha256Hex(CLEAR));
    expect(summary.globalSchema).toEqual({ ints: 2, byteSlices: 3 });
    expect(summary.localSchema).toEqual({ ints: 1, byteSlices: 4 });
    expect(summary.extraPages).toBe(1);
  });

  test("the program address matches what algod compile reports (SHA-512/256 of Program + bytes)", () => {
    const summary = describeApplicationCall(create())!;
    const expected = new algosdk.LogicSigAccount(APPROVAL).address().toString();
    expect(summary.approval?.address).toBe(expected);
    expect(summary.clear?.address).toBe(new algosdk.LogicSigAccount(CLEAR).address().toString());
  });

  test("a program made only of printable characters (rejected by LogicSigAccount) still gets an address", () => {
    const text = new TextEncoder().encode("hello world, not teal");
    const summary = describeApplicationCall(create({ approvalProgram: text }))!;
    expect(summary.approval?.address).toMatch(/^[A-Z2-7]{58}$/);
  });

  test("a creation that also opts the creator in is still a create", () => {
    const summary = describeApplicationCall(create({ onComplete: algosdk.OnApplicationComplete.OptInOC }))!;
    expect(summary.kind).toBe("create");
    expect(summary.onComplete).toBe("OptIn");
  });

  test("an update replaces the code of an existing app (high impact)", () => {
    const summary = describeApplicationCall(call(algosdk.OnApplicationComplete.UpdateApplicationOC, 777))!;
    expect(summary.kind).toBe("update");
    expect(summary.risk).toBe("high");
    expect(summary.appIndex).toBe(777);
    expect(summary.approval?.size).toBe(APPROVAL.length);
    expect(summary.globalSchema).toBeUndefined();
  });

  test("a delete destroys the app (high impact), no programs", () => {
    const summary = describeApplicationCall(call(algosdk.OnApplicationComplete.DeleteApplicationOC, 55))!;
    expect(summary.kind).toBe("delete");
    expect(summary.risk).toBe("high");
    expect(summary.appIndex).toBe(55);
    expect(summary.approval).toBeUndefined();
  });

  test("close-out and clear-state are medium, opt-in and no-op are not flagged", () => {
    expect(describeApplicationCall(call(algosdk.OnApplicationComplete.CloseOutOC))!.risk).toBe("medium");
    expect(describeApplicationCall(call(algosdk.OnApplicationComplete.ClearStateOC))!.risk).toBe("medium");
    expect(describeApplicationCall(call(algosdk.OnApplicationComplete.OptInOC))!.risk).toBe("none");
    const noop = describeApplicationCall(call(algosdk.OnApplicationComplete.NoOpOC))!;
    expect(noop.kind).toBe("call");
    expect(noop.risk).toBe("none");
  });

  test("the argument count is reported", () => {
    const txn = algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      suggestedParams: params,
      appIndex: 9,
      appArgs: [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])],
    });
    expect(describeApplicationCall(txn)!.argsCount).toBe(3);
  });

  test("the hash of a program that is a view into a larger buffer covers only the view", () => {
    const backing = new Uint8Array(100).fill(0x22);
    const view = backing.subarray(10, 40);
    const summary = describeApplicationCall(create({ approvalProgram: view }))!;
    expect(summary.approval?.size).toBe(30);
    expect(summary.approval?.sha256).toBe(sha256Hex(view));
  });

  test("a program of the largest allowed size (4 pages) is shown in full", () => {
    const max = new Uint8Array(4 * 2048).fill(0x11); // 4 pages x 2048 bytes = 8 KB
    const summary = describeApplicationCall(create({ approvalProgram: max }))!;
    expect(summary.approval?.truncated).toBeUndefined();
    expect(summary.approval?.hex.length).toBe(max.length * 2);
    expect(summary.approval?.sha256).toBe(sha256Hex(max));
  });

  test("a create that also deletes or closes out stays high impact and says so", () => {
    const summary = describeApplicationCall(create({ onComplete: algosdk.OnApplicationComplete.DeleteApplicationOC }))!;
    expect(summary.kind).toBe("create");
    expect(summary.risk).toBe("high");
    expect(summary.onComplete).toBe("Delete");
  });

  test("an unknown OnComplete value is not reported as a harmless NoOp", () => {
    const summary = describeApplicationCall({
      type: "appl",
      applicationCall: { appIndex: 5n, onComplete: 9 },
    })!;
    expect(summary.onComplete).toBe("Unknown (9)");
    expect(summary.risk).toBe("high");
  });

  test("a payment has no application summary", () => {
    const pay = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: sender,
      amount: 1,
      suggestedParams: params,
    });
    expect(describeApplicationCall(pay)).toBeUndefined();
  });

  test("very large programs keep their full hash but a bounded byte preview", () => {
    const big = new Uint8Array(70000).fill(0xab);
    const summary = describeApplicationCall(create({ approvalProgram: big }))!;
    expect(summary.approval?.size).toBe(70000);
    expect(summary.approval?.sha256).toBe(sha256Hex(big));
    expect(summary.approval!.hex.length).toBe(PROGRAM_PREVIEW_BYTES * 2);
    expect(summary.approval?.truncated).toBe(true);
  });
});

test.describe("isLifecycle", () => {
  test("only create, update and delete get the lifecycle card", () => {
    expect(isLifecycle(describeApplicationCall(create()))).toBe(true);
    expect(isLifecycle(describeApplicationCall(call(algosdk.OnApplicationComplete.UpdateApplicationOC)))).toBe(true);
    expect(isLifecycle(describeApplicationCall(call(algosdk.OnApplicationComplete.DeleteApplicationOC)))).toBe(true);
    expect(isLifecycle(describeApplicationCall(call(algosdk.OnApplicationComplete.CloseOutOC)))).toBe(false);
    expect(isLifecycle(describeApplicationCall(call(algosdk.OnApplicationComplete.NoOpOC)))).toBe(false);
    expect(isLifecycle(undefined)).toBe(false);
  });
});
