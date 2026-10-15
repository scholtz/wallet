import { test, expect } from "@playwright/test";
import {
  balanceSnapshot,
  refreshUntilChanged,
} from "../../src/scripts/swap/refreshBalance";

const noSleep = async () => {};

test.describe("balanceSnapshot", () => {
  test("is empty without account data", () => {
    expect(balanceSnapshot(false)).toBe("");
    expect(balanceSnapshot(undefined)).toBe("");
  });
  test("changes when the ALGO balance changes", () => {
    expect(balanceSnapshot({ amount: 5n, assets: [] })).not.toBe(
      balanceSnapshot({ amount: 6n, assets: [] })
    );
  });
  test("changes when an asset balance changes", () => {
    const a = balanceSnapshot({ amount: 5n, assets: [{ assetId: 1, amount: 10n }] });
    const b = balanceSnapshot({ amount: 5n, assets: [{ assetId: 1, amount: 3n }] });
    expect(a).not.toBe(b);
  });
  test("ignores asset order", () => {
    const a = balanceSnapshot({
      amount: 1,
      assets: [{ assetId: 1, amount: 1 }, { assetId: 2, amount: 2 }],
    });
    const b = balanceSnapshot({
      amount: 1,
      assets: [{ assetId: 2, amount: 2 }, { assetId: 1, amount: 1 }],
    });
    expect(a).toBe(b);
  });
});

test.describe("refreshUntilChanged", () => {
  test("keeps reading until the indexer returns the new balance", async () => {
    let calls = 0;
    let balance = "old";
    const changed = await refreshUntilChanged(
      async () => {
        calls++;
        if (calls === 3) balance = "new";
      },
      () => balance,
      "old",
      { attempts: 6, delayMs: 0, sleep: noSleep }
    );
    expect(changed).toBe(true);
    expect(calls).toBe(3);
  });
  test("gives up after the attempts and reports no change", async () => {
    let calls = 0;
    const changed = await refreshUntilChanged(
      async () => {
        calls++;
      },
      () => "old",
      "old",
      { attempts: 4, delayMs: 0, sleep: noSleep }
    );
    expect(changed).toBe(false);
    expect(calls).toBe(4);
  });
  test("a failing reload does not throw and is retried", async () => {
    let calls = 0;
    let balance = "old";
    const changed = await refreshUntilChanged(
      async () => {
        calls++;
        if (calls === 1) throw new Error("indexer down");
        balance = "new";
      },
      () => balance,
      "old",
      { attempts: 3, delayMs: 0, sleep: noSleep }
    );
    expect(changed).toBe(true);
    expect(calls).toBe(2);
  });
  test("does not sleep after the last attempt", async () => {
    const sleeps: number[] = [];
    await refreshUntilChanged(async () => {}, () => "old", "old", {
      attempts: 3,
      delayMs: 7,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(sleeps).toEqual([7, 7]);
  });
});
