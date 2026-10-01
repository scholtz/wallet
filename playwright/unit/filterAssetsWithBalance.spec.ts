import { test, expect } from "@playwright/test";
import { filterAssetsWithBalance } from "../../src/scripts/assets/filterAssetsWithBalance";

const assets = [
  { assetId: 0n, amount: 0n },
  { assetId: 1n, amount: 5n },
  { assetId: 2n, amount: 0n },
  { assetId: 3n, amount: undefined },
];

test.describe("filterAssetsWithBalance", () => {
  test("disabled returns everything", () => {
    expect(filterAssetsWithBalance(assets, false)).toHaveLength(4);
  });
  test("enabled hides zero balances", () => {
    // empty keep id keeps the native token (id 0)
    expect(filterAssetsWithBalance(assets, true).map((a) => a.assetId)).toEqual([
      0n,
      1n,
    ]);
  });
  test("keeps the selected asset even with zero balance", () => {
    expect(
      filterAssetsWithBalance(assets, true, "2").map((a) => a.assetId),
    ).toEqual([1n, 2n]);
  });
});
