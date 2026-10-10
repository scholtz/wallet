// Node-only unit tests for the checks applied to every dApp sign request
// (AW-2026-063 genesis hash, AW-2026-064 group completeness).
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  checkTransactionGroup,
  checkTxGenesis,
  findGenesisMismatch,
} from "../../src/scripts/dappRequestChecks";
import { KNOWN_NETWORKS } from "../../src/scripts/direct/networks";

const sender = algosdk.generateAccount().addr.toString();
const receiver = algosdk.generateAccount().addr.toString();
const MAINNET_HASH = Buffer.from(KNOWN_NETWORKS["mainnet-v1.0"].hash, "base64");
const TESTNET_HASH = Buffer.from(KNOWN_NETWORKS["testnet-v1.0"].hash, "base64");

function payment(genesisHash: Buffer, genesisID: string, amount = 1) {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver,
    amount,
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

test.describe("checkTxGenesis (AW-2026-063)", () => {
  test("accepts a transaction of the selected network", () => {
    const tx = payment(MAINNET_HASH, "mainnet-v1.0");
    expect(checkTxGenesis(tx, "mainnet-v1.0")).toBe("ok");
  });

  test("blocks a foreign genesis hash even when the genesis ID claims the selected network", () => {
    const tx = payment(TESTNET_HASH, "mainnet-v1.0");
    expect(checkTxGenesis(tx, "mainnet-v1.0")).toBe("hash_mismatch");
  });

  test("blocks a genesis ID of another network", () => {
    const tx = payment(MAINNET_HASH, "testnet-v1.0");
    expect(checkTxGenesis(tx, "mainnet-v1.0")).toBe("id_mismatch");
  });

  test("warns (does not block) when the genesis ID is absent but the hash is right", () => {
    const tx = payment(MAINNET_HASH, "");
    expect(checkTxGenesis(tx, "mainnet-v1.0")).toBe("missing_id");
  });

  test("a custom node has no expected network", () => {
    const tx = payment(TESTNET_HASH, "testnet-v1.0");
    expect(checkTxGenesis(tx, "custom")).toBe("ok");
  });

  test("an environment outside the built-in table only warns when the genesis ID differs (never blocks)", () => {
    const tx = payment(TESTNET_HASH, "somenet-v1");
    expect(checkTxGenesis(tx, "somenet-v1")).toBe("ok");
    expect(checkTxGenesis(tx, "othernet-v1")).toBe("id_differs");
  });
});

test.describe("checkTransactionGroup (AW-2026-064)", () => {
  const make = (offset = 0) =>
    [1, 2, 3].map((n) => payment(MAINNET_HASH, "mainnet-v1.0", n + offset));

  test("ungrouped transactions are fine", () => {
    expect(checkTransactionGroup(make().slice(0, 1))).toBe("ok");
  });

  test("a complete group is fine", () => {
    const txns = make();
    algosdk.assignGroupID(txns);
    expect(checkTransactionGroup(txns)).toBe("ok");
  });

  test("a group with a member missing is refused", () => {
    const txns = make();
    algosdk.assignGroupID(txns);
    expect(checkTransactionGroup(txns.slice(0, 2))).toBe("incomplete");
  });

  test("several complete groups in one request are fine", () => {
    const a = make();
    const b = make(100);
    algosdk.assignGroupID(a);
    algosdk.assignGroupID(b);
    expect(checkTransactionGroup([...a, ...b])).toBe("ok");
  });

  test("a complete group next to an ungrouped transaction is fine", () => {
    const a = make();
    algosdk.assignGroupID(a);
    expect(checkTransactionGroup([...a, payment(MAINNET_HASH, "mainnet-v1.0", 9)])).toBe("ok");
  });

  test("one incomplete group among complete ones is refused", () => {
    const a = make();
    const b = make(100);
    algosdk.assignGroupID(a);
    algosdk.assignGroupID(b);
    expect(checkTransactionGroup([...a, b[0], b[1]])).toBe("incomplete");
  });

  test("members of different groups are refused", () => {
    const a = make();
    const b = make(100);
    algosdk.assignGroupID(a);
    algosdk.assignGroupID(b);
    expect(checkTransactionGroup([a[0], b[1]])).toBe("incomplete");
  });

  test("a group member next to an ungrouped transaction is still an incomplete group", () => {
    const txns = make();
    algosdk.assignGroupID(txns);
    const loose = payment(MAINNET_HASH, "mainnet-v1.0", 9);
    expect(checkTransactionGroup([txns[0], loose])).toBe("incomplete");
  });
});

test.describe("findGenesisMismatch (AW-2026-063, request admission)", () => {
  test("returns undefined when every transaction is on the selected network", () => {
    const txns = [payment(MAINNET_HASH, "mainnet-v1.0"), payment(MAINNET_HASH, "mainnet-v1.0", 2)];
    expect(findGenesisMismatch(txns, "mainnet-v1.0")).toBeUndefined();
  });

  test("returns the index of the first transaction of another network", () => {
    const txns = [payment(MAINNET_HASH, "mainnet-v1.0"), payment(TESTNET_HASH, "testnet-v1.0")];
    expect(findGenesisMismatch(txns, "mainnet-v1.0")).toBe(1);
  });

  test("a missing genesis ID alone does not refuse the request", () => {
    expect(findGenesisMismatch([payment(MAINNET_HASH, "")], "mainnet-v1.0")).toBeUndefined();
  });
});

test("a local chain with its own genesis ID is not refused on a preset env (AW-2026-063 regression guard)", () => {
  const tx = payment(TESTNET_HASH, "dockernet-v1");
  expect(findGenesisMismatch([tx], "sandnet-v1")).toBeUndefined();
});