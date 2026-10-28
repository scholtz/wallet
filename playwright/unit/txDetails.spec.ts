// Node-only unit tests for the description of acfg / afrz / keyreg transactions (AW-2026-081).
import { test, expect } from "@playwright/test";
import {
  describeAssetConfig,
  describeAssetFreeze,
  describeKeyReg,
  describeLease,
  summarizeSpecialTransaction,
  type DetailTxnLike,
} from "../../src/scripts/txDetails";

const addr = (value: string) => ({ toString: () => value });

const acfg = (over: Partial<NonNullable<DetailTxnLike["assetConfig"]>>): DetailTxnLike => ({
  type: "acfg",
  assetConfig: { assetIndex: 7n, total: 0n, decimals: 0, defaultFrozen: false, ...over },
});

test.describe("describeAssetConfig", () => {
  test("an asset id of zero creates an asset", () => {
    const details = describeAssetConfig(
      acfg({ assetIndex: 0n, total: 1000n, decimals: 2, assetName: "Coin", unitName: "CN" }),
    );
    expect(details).toMatchObject({ kind: "create", total: "1000", decimals: 2, assetName: "Coin" });
  });

  test("changing control addresses of an existing asset is a reconfiguration", () => {
    const details = describeAssetConfig(
      acfg({ manager: addr("MGR"), clawback: addr("ATTACKER") }),
    );
    expect(details).toMatchObject({ kind: "reconfigure", manager: "MGR", clawback: "ATTACKER" });
    expect(details?.reserve).toBeUndefined();
  });

  test("a config with every parameter empty destroys the asset", () => {
    expect(describeAssetConfig(acfg({}))).toMatchObject({ kind: "destroy", assetIndex: "7" });
  });

  test("an all-zero metadata hash does not stop a destroy from being recognised", () => {
    expect(describeAssetConfig(acfg({ assetMetadataHash: new Uint8Array(32) }))?.kind).toBe("destroy");
    expect(describeAssetConfig(acfg({ assetMetadataHash: new Uint8Array(32).fill(1) }))?.kind).toBe(
      "reconfigure",
    );
  });

  test("other transaction types are not described", () => {
    expect(describeAssetConfig({ type: "pay" })).toBeUndefined();
  });
});

test.describe("describeAssetFreeze", () => {
  test("reports the frozen account and direction", () => {
    const txn: DetailTxnLike = {
      type: "afrz",
      assetFreeze: { assetIndex: 5n, freezeAccount: addr("VICTIM"), frozen: true },
    };
    expect(describeAssetFreeze(txn)).toEqual({ assetIndex: "5", account: "VICTIM", frozen: true });
  });
});

test.describe("describeKeyReg", () => {
  test("non-participation wins over every other flag", () => {
    const txn: DetailTxnLike = {
      type: "keyreg",
      keyreg: { nonParticipation: true, voteKey: new Uint8Array(32).fill(1) },
    };
    expect(describeKeyReg(txn)?.kind).toBe("nonparticipation");
  });

  test("a registration with keys goes online, one without goes offline", () => {
    const online: DetailTxnLike = {
      type: "keyreg",
      keyreg: {
        nonParticipation: false,
        voteKey: new Uint8Array(32).fill(1),
        selectionKey: new Uint8Array(32).fill(2),
        voteFirst: 10n,
        voteLast: 20n,
      },
    };
    expect(describeKeyReg(online)).toEqual({ kind: "online", voteFirst: "10", voteLast: "20" });
    expect(describeKeyReg({ type: "keyreg", keyreg: { nonParticipation: false } })?.kind).toBe("offline");
  });
});

test.describe("describeLease", () => {
  test("hides an unset or all-zero lease and shows a real one as hex", () => {
    expect(describeLease({})).toBeUndefined();
    expect(describeLease({ lease: new Uint8Array(32) })).toBeUndefined();
    expect(describeLease({ lease: Uint8Array.from([1, 171]) })).toBe("01ab");
  });
});

test.describe("summarizeSpecialTransaction", () => {
  test("maps each kind to a locale key and marks authority changes as dangerous", () => {
    expect(summarizeSpecialTransaction(acfg({ assetIndex: 0n }))).toMatchObject({
      key: "tx_acfg_create",
      danger: false,
    });
    expect(summarizeSpecialTransaction(acfg({ manager: addr("M") }))).toMatchObject({
      key: "tx_acfg_reconfigure",
      danger: true,
    });
    expect(summarizeSpecialTransaction(acfg({}))).toMatchObject({ key: "tx_acfg_destroy", danger: true });
    expect(
      summarizeSpecialTransaction({
        type: "afrz",
        assetFreeze: { assetIndex: 1n, freezeAccount: addr("A"), frozen: false },
      }),
    ).toMatchObject({ key: "tx_afrz_unfreeze", danger: false });
    expect(
      summarizeSpecialTransaction({ type: "keyreg", keyreg: { nonParticipation: true } }),
    ).toMatchObject({ key: "tx_keyreg_nonparticipation", danger: true });
    expect(summarizeSpecialTransaction({ type: "pay" })).toBeUndefined();
  });
});
