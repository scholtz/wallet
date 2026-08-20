// Node-only unit test (no browser, no dev server) for the pure Biatec Router
// split-route combination logic. Run via `pnpm run test:unit`
// (playwright test -c playwright.unit.config.ts).
import { test, expect } from "@playwright/test";
import type { biatecRouter } from "biatec-router";
import { combineRouteResponse } from "../../src/scripts/aggregators/combineBiatecRoute";

// Mirrors the real production scenario that surfaced the bug: a 100 USDC swap
// the router split 40/40/20 across three legs. The combined route the app
// displays and compares must account for ALL legs' inputs/outputs/fees/hops,
// not just the first leg's.
function makeSplitResponse(): biatecRouter.RouteOutputCover {
  const leg = (
    inputAmount: number,
    outputAmount: number,
    fee: number,
    hops: biatecRouter.HopExecution[],
    txs: string[],
  ) => ({
    route: {
      fromAsset: 31566704, // USDC
      toAsset: 227855942, // EURS
      inputAmount,
      outputAmount,
      totalNetworkFeeMicroAlgos: fee,
      hops,
    },
    txsToSign: txs,
  });
  return {
    routes: [
      leg(
        40_000_000,
        20_448_600,
        21_000,
        [{ fromAsset: 31566704, toAsset: 0, inputAmount: 40_000_000 }],
        ["txA1", "txA2"],
      ),
      leg(
        40_000_000,
        17_322_958,
        21_000,
        [{ fromAsset: 31566704, toAsset: 312769, inputAmount: 40_000_000 }],
        ["txB1"],
      ),
      leg(
        20_000_000,
        6_388_959,
        21_000,
        [{ fromAsset: 31566704, toAsset: 386192725, inputAmount: 20_000_000 }],
        ["txC1", "txC2"],
      ),
    ],
  };
}

test("sums inputAmount across every leg of a split route, not just the first", () => {
  const combined = combineRouteResponse(makeSplitResponse());
  expect(combined.route.inputAmount).toBe(100_000_000);
});

test("sums outputAmount and network fees across every leg", () => {
  const combined = combineRouteResponse(makeSplitResponse());
  expect(combined.route.outputAmount).toBe(20_448_600 + 17_322_958 + 6_388_959);
  expect(combined.route.totalNetworkFeeMicroAlgos).toBe(63_000);
});

test("concatenates hops and txsToSign across every leg, in order", () => {
  const combined = combineRouteResponse(makeSplitResponse());
  expect(combined.route.hops?.length).toBe(3);
  expect(combined.txsToSign).toEqual(["txA1", "txA2", "txB1", "txC1", "txC2"]);
});

test("a single-leg route passes through unchanged", () => {
  const single: biatecRouter.RouteOutputCover = {
    routes: [
      {
        route: {
          fromAsset: 0,
          toAsset: 31566704,
          inputAmount: 5_000_000,
          outputAmount: 1_234_567,
          totalNetworkFeeMicroAlgos: 4_000,
          hops: [{ fromAsset: 0, toAsset: 31566704, inputAmount: 5_000_000 }],
        },
        txsToSign: ["tx1"],
      },
    ],
  };
  const combined = combineRouteResponse(single);
  expect(combined.route.inputAmount).toBe(5_000_000);
  expect(combined.route.outputAmount).toBe(1_234_567);
  expect(combined.txsToSign).toEqual(["tx1"]);
});

test("an empty routes array yields a zeroed combined route", () => {
  const combined = combineRouteResponse({ routes: [] });
  expect(combined.route.inputAmount).toBe(0);
  expect(combined.route.outputAmount).toBe(0);
  expect(combined.txsToSign).toEqual([]);
});
