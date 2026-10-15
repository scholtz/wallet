import { test, expect } from "@playwright/test";
import {
  balanceSnapshot,
  refreshUntilChanged,
  settleAfterSwap,
  type SettleSwapDeps,
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
  test("restricted to the watched assets, unrelated changes are ignored", () => {
    const before = { amount: 5n, assets: [{ assetId: 1, amount: 10n }, { assetId: 2, amount: 1n }] };
    const unrelated = { amount: 9n, assets: [{ assetId: 1, amount: 10n }, { assetId: 2, amount: 7n }] };
    const swapped = { amount: 5n, assets: [{ assetId: 1, amount: 3n }, { assetId: 2, amount: 1n }] };
    expect(balanceSnapshot(unrelated, [1n, null])).toBe(balanceSnapshot(before, [1n, null]));
    expect(balanceSnapshot(swapped, [1n, null])).not.toBe(balanceSnapshot(before, [1n, null]));
    // asset 0 is ALGO
    expect(balanceSnapshot(unrelated, [0n])).not.toBe(balanceSnapshot(before, [0n]));
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

test.describe("settleAfterSwap", () => {
  const make = (over: Partial<SettleSwapDeps> = {}) => {
    const log: string[] = [];
    let balance = "old";
    let reloads = 0;
    const deps: SettleSwapDeps = {
      txSent: true,
      clearQuotes: () => log.push("clear"),
      reload: async () => {
        reloads++;
        log.push("reload");
        if (reloads === 2) balance = "new";
      },
      read: () => balance,
      before: "old",
      stillHere: () => true,
      rebuildAssets: async () => {
        log.push("rebuild");
      },
      formUnchanged: () => true,
      clampAmount: () => log.push("clamp"),
      options: { attempts: 5, delayMs: 0, sleep: noSleep },
      ...over,
    };
    return { deps, log };
  };

  test("a submitted swap spends the quote, waits for the indexer, rebuilds and clamps", async () => {
    const { deps, log } = make();
    expect(await settleAfterSwap(deps)).toBe("settled");
    expect(log).toEqual(["clear", "reload", "reload", "rebuild", "clamp"]);
  });
  test("nothing submitted keeps the quote and does not wait", async () => {
    const { deps, log } = make({ txSent: false });
    expect(await settleAfterSwap(deps)).toBe("nothing-sent");
    expect(log).toEqual([]);
  });
  test("the user's edits during the wait are not overwritten", async () => {
    const { deps, log } = make({ formUnchanged: () => false });
    await settleAfterSwap(deps);
    expect(log).not.toContain("clamp");
  });
  test("having left the account, nothing is reloaded or rebuilt", async () => {
    const { deps, log } = make({ stillHere: () => false });
    await settleAfterSwap(deps);
    expect(log).toEqual(["clear"]);
  });
});

test("legacy holdings keyed by asset-id are fingerprinted too", () => {
  const a = balanceSnapshot({ amount: 1, assets: [{ "asset-id": 7, amount: 10 }] }, [7]);
  const b = balanceSnapshot({ amount: 1, assets: [{ "asset-id": 7, amount: 3 }] }, [7]);
  expect(a).not.toBe(b);
  // nothing to watch -> unfiltered, still sensitive to changes
  expect(balanceSnapshot({ amount: 1 }, [null, null])).not.toBe(
    balanceSnapshot({ amount: 2 }, [null, null])
  );
});
