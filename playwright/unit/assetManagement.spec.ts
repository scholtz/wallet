import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  actionRole,
  actionSender,
  assertAssetManagementTxnSafe,
  assetActionPath,
  buildAssetClawbackTxn,
  buildAssetConfigTxn,
  buildAssetDestroyTxn,
  buildAssetFreezeTxn,
  checkClawback,
  checkConfigChange,
  checkDestroy,
  checkFreeze,
  configTxnRoles,
  formatAssetAmount,
  isConfigChangeAllowed,
  parseAssetAction,
  parseAssetAmount,
  parseAssetId,
  rolesHeldBy,
  toManagedAsset,
  type AssetRoles,
} from "../../src/scripts/assets/management";

const addr = () => algosdk.generateAccount().addr.toString();
const manager = addr();
const reserve = addr();
const freeze = addr();
const clawback = addr();
const holder = addr();
const assetId = 1234n;

const suggestedParams: algosdk.SuggestedParams = {
  fee: 1000n,
  minFee: 1000n,
  flatFee: true,
  firstValid: 100n,
  lastValid: 1100n,
  genesisHash: Buffer.from(
    "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
    "base64",
  ),
  genesisID: "mainnet-v1.0",
};

const roles: AssetRoles = { manager, reserve, freeze, clawback };
const optedIn = (amount: bigint, frozen = false) => ({
  optedIn: true,
  amount,
  frozen,
});

test.describe("roles and routes", () => {
  test("each action is signed by its role address", () => {
    expect(actionRole("freeze")).toBe("freeze");
    expect(actionRole("clawback")).toBe("clawback");
    expect(actionRole("modify")).toBe("manager");
    expect(actionRole("destroy")).toBe("manager");
    expect(actionSender({ roles }, "freeze")).toBe(freeze);
    expect(actionSender({ roles }, "destroy")).toBe(manager);
  });
  test("a disabled role has no sender", () => {
    expect(
      actionSender({ roles: { ...roles, clawback: "" } }, "clawback"),
    ).toBeUndefined();
  });
  test("roles held by an address", () => {
    const same = addr();
    expect(
      rolesHeldBy(
        { roles: { manager: same, reserve: "", freeze: same, clawback } },
        same,
      ),
    ).toEqual(["manager", "freeze"]);
    expect(rolesHeldBy({ roles }, holder)).toEqual([]);
  });
  test("route parameters", () => {
    expect(parseAssetAction("freeze")).toBe("freeze");
    expect(parseAssetAction("revoke")).toBeUndefined();
    expect(parseAssetAction(undefined)).toBeUndefined();
    expect(parseAssetId("31566704")).toBe(31566704n);
    for (const bad of [
      "0",
      "-1",
      "1.5",
      "abc",
      "",
      "18446744073709551616",
      undefined,
    ]) {
      expect(parseAssetId(bad)).toBeUndefined();
    }
    expect(assetActionPath(5n)).toBe("/asset/manage/5");
    expect(assetActionPath(5n, "clawback")).toBe("/asset/revoke/5");
    expect(assetActionPath("5", "modify")).toBe("/asset/modify/5");
  });
  test("algod / indexer parameters map onto the managed asset", () => {
    const asset = toManagedAsset(7, {
      creator: manager,
      decimals: 2,
      total: 1000,
      manager,
      freeze: algosdk.Address.fromString(freeze),
    });
    expect(asset).toEqual({
      assetId: 7n,
      name: "",
      unitName: "",
      url: "",
      decimals: 2,
      total: 1000n,
      defaultFrozen: false,
      creator: manager,
      roles: { manager, reserve: "", freeze, clawback: "" },
    });
  });
});

test.describe("amounts", () => {
  test("parses decimal input into base units", () => {
    expect(parseAssetAmount("1.5", 6)).toBe(1_500_000n);
    expect(parseAssetAmount(" 2 ", 0)).toBe(2n);
    expect(parseAssetAmount(".25", 2)).toBe(25n);
    expect(parseAssetAmount("3.", 2)).toBe(300n);
    expect(parseAssetAmount("1.500", 1)).toBe(15n);
  });
  test("refuses what is not an exact positive amount", () => {
    for (const bad of [
      "",
      ".",
      "0",
      "0.00",
      "-1",
      "1e3",
      "1,000",
      "1.234",
      "abc",
      "18446744073709551616",
    ]) {
      expect(parseAssetAmount(bad, 2)).toBeUndefined();
    }
  });
  test("formats base units", () => {
    expect(formatAssetAmount(1_500_000n, 6)).toBe("1.5");
    expect(formatAssetAmount(10n, 0)).toBe("10");
    expect(formatAssetAmount(5n, 3)).toBe("0.005");
    expect(formatAssetAmount(2000n, 3)).toBe("2");
  });
});

test.describe("checks", () => {
  test("freeze needs a valid, opted-in holder whose state changes", () => {
    expect(
      checkFreeze({ targetValid: false, holding: undefined, frozen: true }),
    ).toBe("invalid_target");
    expect(
      checkFreeze({
        targetValid: true,
        holding: { optedIn: false, amount: 0n, frozen: false },
        frozen: true,
      }),
    ).toBe("not_opted_in");
    expect(
      checkFreeze({
        targetValid: true,
        holding: optedIn(1n, true),
        frozen: true,
      }),
    ).toBe("no_change");
    expect(
      checkFreeze({
        targetValid: true,
        holding: optedIn(1n, true),
        frozen: false,
      }),
    ).toBeUndefined();
    expect(
      checkFreeze({ targetValid: true, holding: optedIn(0n), frozen: true }),
    ).toBeUndefined();
  });

  test("clawback", () => {
    const base = {
      target: holder,
      receiver: reserve,
      targetValid: true,
      receiverValid: true,
      targetHolding: optedIn(100n, true),
      receiverHolding: optedIn(0n),
      amount: 100n,
    };
    // A frozen holder can still be clawed back.
    expect(checkClawback(base)).toBeUndefined();
    expect(checkClawback({ ...base, targetValid: false })).toBe(
      "invalid_target",
    );
    expect(checkClawback({ ...base, receiverValid: false })).toBe(
      "invalid_receiver",
    );
    expect(checkClawback({ ...base, receiver: holder })).toBe("same_account");
    expect(checkClawback({ ...base, targetHolding: undefined })).toBe(
      "target_not_opted_in",
    );
    expect(
      checkClawback({
        ...base,
        receiverHolding: { optedIn: false, amount: 0n, frozen: false },
      }),
    ).toBe("receiver_not_opted_in");
    expect(checkClawback({ ...base, amount: undefined })).toBe(
      "invalid_amount",
    );
    expect(checkClawback({ ...base, amount: 101n })).toBe(
      "insufficient_balance",
    );
  });

  test("config change: clearing is reported, restoring and invalid addresses are refused", () => {
    const valid = algosdk.isValidAddress;
    const newManager = addr();
    const unchanged = checkConfigChange(roles, { ...roles }, valid);
    expect(unchanged.changed).toBe(false);
    expect(isConfigChangeAllowed(unchanged)).toBe(false);

    const moved = checkConfigChange(
      roles,
      { ...roles, manager: ` ${newManager} ` },
      valid,
    );
    expect(moved).toMatchObject({
      changed: true,
      cleared: [],
      restored: [],
      invalid: [],
    });
    expect(isConfigChangeAllowed(moved)).toBe(true);

    const cleared = checkConfigChange(
      roles,
      { ...roles, clawback: "", manager: "" },
      valid,
    );
    expect(cleared.cleared).toEqual(["manager", "clawback"]);
    expect(cleared.managerCleared).toBe(true);
    expect(isConfigChangeAllowed(cleared)).toBe(true);

    const restored = checkConfigChange(
      { ...roles, freeze: "" },
      { ...roles, freeze: holder },
      valid,
    );
    expect(restored.restored).toEqual(["freeze"]);
    expect(isConfigChangeAllowed(restored)).toBe(false);

    const invalid = checkConfigChange(
      roles,
      { ...roles, reserve: "NOT-AN-ADDRESS" },
      valid,
    );
    expect(invalid.invalid).toEqual(["reserve"]);
    expect(isConfigChangeAllowed(invalid)).toBe(false);

    // An asset config without any address is a destroy.
    const all = checkConfigChange(
      roles,
      { manager: "", reserve: "", freeze: "", clawback: "" },
      valid,
    );
    expect(all.allCleared).toBe(true);
    expect(isConfigChangeAllowed(all)).toBe(false);
  });

  test("destroy needs the whole supply in the creator's account", () => {
    expect(
      checkDestroy({ total: 10n, creatorHolding: optedIn(10n) }),
    ).toBeUndefined();
    expect(checkDestroy({ total: 10n, creatorHolding: optedIn(9n) })).toBe(
      "supply_outstanding",
    );
    expect(checkDestroy({ total: 10n, creatorHolding: undefined })).toBe(
      "creator_unknown",
    );
  });
});

test.describe("transactions", () => {
  test("freeze", () => {
    const txn = buildAssetFreezeTxn({
      sender: freeze,
      assetId,
      target: holder,
      frozen: true,
      suggestedParams,
    });
    expect(txn.type).toBe(algosdk.TransactionType.afrz);
    expect(txn.sender.toString()).toBe(freeze);
    expect(txn.assetFreeze?.freezeAccount.toString()).toBe(holder);
    expect(txn.assetFreeze?.frozen).toBe(true);
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: freeze,
        assetId,
        action: "freeze",
      }),
    ).not.toThrow();
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: manager,
        assetId,
        action: "freeze",
      }),
    ).toThrow();
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: freeze,
        assetId: 1n,
        action: "freeze",
      }),
    ).toThrow();
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: freeze,
        assetId,
        action: "clawback",
      }),
    ).toThrow();
  });

  test("clawback sets the revocation target", () => {
    const txn = buildAssetClawbackTxn({
      sender: clawback,
      assetId,
      target: holder,
      receiver: reserve,
      amount: 5n,
      suggestedParams,
    });
    expect(txn.type).toBe(algosdk.TransactionType.axfer);
    expect(txn.assetTransfer?.assetSender?.toString()).toBe(holder);
    expect(txn.assetTransfer?.receiver.toString()).toBe(reserve);
    expect(txn.assetTransfer?.amount).toBe(5n);
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: clawback,
        assetId,
        action: "clawback",
      }),
    ).not.toThrow();
    // A plain transfer of the clawback account's own units is no clawback.
    const plain = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: clawback,
      receiver: reserve,
      assetIndex: assetId,
      amount: 5n,
      suggestedParams,
    });
    expect(() =>
      assertAssetManagementTxnSafe(plain, {
        sender: clawback,
        assetId,
        action: "clawback",
      }),
    ).toThrow();
  });

  test("config always carries every address and can clear some of them", () => {
    const newManager = addr();
    const txn = buildAssetConfigTxn({
      sender: manager,
      assetId,
      roles: { manager: newManager, reserve, freeze: "", clawback },
      suggestedParams,
    });
    expect(txn.type).toBe(algosdk.TransactionType.acfg);
    expect(configTxnRoles(txn)).toEqual({
      manager: newManager,
      reserve,
      freeze: "",
      clawback,
    });
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: manager,
        assetId,
        action: "modify",
      }),
    ).not.toThrow();
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: manager,
        assetId,
        action: "destroy",
      }),
    ).toThrow();
    // The cleared address survives encoding as "absent", not as some other address.
    const decoded = algosdk.decodeUnsignedTransaction(
      algosdk.encodeUnsignedTransaction(txn),
    );
    expect(configTxnRoles(decoded)).toEqual({
      manager: newManager,
      reserve,
      freeze: "",
      clawback,
    });
  });

  test("destroy", () => {
    const txn = buildAssetDestroyTxn({
      sender: manager,
      assetId,
      suggestedParams,
    });
    expect(txn.type).toBe(algosdk.TransactionType.acfg);
    expect(configTxnRoles(txn)).toEqual({
      manager: "",
      reserve: "",
      freeze: "",
      clawback: "",
    });
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: manager,
        assetId,
        action: "destroy",
      }),
    ).not.toThrow();
    expect(() =>
      assertAssetManagementTxnSafe(txn, {
        sender: manager,
        assetId,
        action: "modify",
      }),
    ).toThrow();
  });

  test("rekeys and abnormal fees are refused", () => {
    const rekey = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
      sender: freeze,
      assetIndex: assetId,
      freezeTarget: holder,
      frozen: true,
      rekeyTo: addr(),
      suggestedParams,
    });
    expect(() =>
      assertAssetManagementTxnSafe(rekey, {
        sender: freeze,
        assetId,
        action: "freeze",
      }),
    ).toThrow(/rekey/);
    const expensive = buildAssetFreezeTxn({
      sender: freeze,
      assetId,
      target: holder,
      frozen: true,
      suggestedParams: { ...suggestedParams, fee: 1_000_000n },
    });
    expect(() =>
      assertAssetManagementTxnSafe(expensive, {
        sender: freeze,
        assetId,
        action: "freeze",
      }),
    ).toThrow(/fee/);
  });

  test("the transaction must carry what the user chose", () => {
    const freezeTxn = buildAssetFreezeTxn({
      sender: freeze,
      assetId,
      target: holder,
      frozen: true,
      suggestedParams,
    });
    const base = { sender: freeze, assetId, action: "freeze" as const };
    expect(() =>
      assertAssetManagementTxnSafe(freezeTxn, {
        ...base,
        freeze: { target: holder, frozen: true },
      }),
    ).not.toThrow();
    expect(() =>
      assertAssetManagementTxnSafe(freezeTxn, {
        ...base,
        freeze: { target: addr(), frozen: true },
      }),
    ).toThrow(/requested/);
    expect(() =>
      assertAssetManagementTxnSafe(freezeTxn, {
        ...base,
        freeze: { target: holder, frozen: false },
      }),
    ).toThrow(/requested/);

    const clawTxn = buildAssetClawbackTxn({
      sender: clawback,
      assetId,
      target: holder,
      receiver: reserve,
      amount: 5n,
      suggestedParams,
    });
    const claw = { sender: clawback, assetId, action: "clawback" as const };
    expect(() =>
      assertAssetManagementTxnSafe(clawTxn, {
        ...claw,
        clawback: { target: holder, receiver: reserve, amount: 5n },
      }),
    ).not.toThrow();
    for (const wrong of [
      { target: addr(), receiver: reserve, amount: 5n },
      { target: holder, receiver: addr(), amount: 5n },
      { target: holder, receiver: reserve, amount: 6n },
    ]) {
      expect(() =>
        assertAssetManagementTxnSafe(clawTxn, { ...claw, clawback: wrong }),
      ).toThrow(/requested/);
    }

    const cfg = buildAssetConfigTxn({
      sender: manager,
      assetId,
      roles,
      suggestedParams,
    });
    const modify = { sender: manager, assetId, action: "modify" as const };
    expect(() =>
      assertAssetManagementTxnSafe(cfg, { ...modify, roles }),
    ).not.toThrow();
    expect(() =>
      assertAssetManagementTxnSafe(cfg, {
        ...modify,
        roles: { ...roles, freeze: addr() },
      }),
    ).toThrow(/requested/);
  });
});
