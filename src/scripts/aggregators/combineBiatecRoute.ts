// Pure combination logic for Biatec Router's split-route responses, kept free
// of runtime imports (types only) so it can be unit-tested directly in Node
// (see playwright/unit/combineBiatecRoute.spec.ts) without dragging in
// algosdk/vue/the aggregator context.

// biatecRouter is a namespace object (both value and type namespace) - the
// generated client's individual response types (QuoteRoute, HopExecution,
// RouteOutputCover, ...) are only reachable as members of it
// (biatecRouter.QuoteRoute etc.), not as top-level named exports of the
// package.
import type { biatecRouter } from "biatec-router";
import type { BiatecCombinedRoute } from "./types";

// With routesCount <= 1 (the default, and what biatec.ts requests - see the getQuote/execute
// request bodies there), Biatec Router's response.routes holds the LEGS of one combined swap: the
// router may split the requested amount across up to 3 structurally distinct paths to beat any
// single path's price (e.g. part of the trade direct, part via an intermediate asset), and all
// legs share ONE Algorand atomic transaction group server-side. That means the total input spent
// and total output received are each the SUM across legs (not just routes[0]'s own amounts) and
// the transactions to sign are the CONCATENATION of every leg's txsToSign, in order (signing just
// one leg's slice would submit an incomplete/invalid group, since the group hash covers every
// transaction across every leg).
// requesting routesCount: 3 previously disabled this splitting entirely (BiatecRouter's legacy
// "N independent full-amount alternatives" mode) - always leaving real output on the table
// whenever the router had a genuinely better split available, sometimes by 10%+.
// Wrapped into the same { route: { route, txsToSign } } shape the rest of biatec.ts (and
// buildBiatecRouteInfo's hop/pool display) already expects, so downstream code is unchanged.
// hops are merged across every leg too (see below), so the displayed breakdown covers the full
// split, not just the first leg.
export function combineRouteResponse(
  response: biatecRouter.RouteOutputCover,
): BiatecCombinedRoute {
  const routes = response.routes ?? [];
  const totalInputAmount = routes.reduce(
    (sum, r) => sum + (r.route?.inputAmount || 0),
    0,
  );
  const totalOutputAmount = routes.reduce(
    (sum, r) => sum + (r.route?.outputAmount || 0),
    0,
  );
  const totalFees = routes.reduce(
    (sum, r) => sum + (r.route?.totalNetworkFeeMicroAlgos || 0),
    0,
  );
  // Each leg carries its own hops; spreading only routes[0]?.route would silently drop every
  // other leg's hops even though inputAmount/outputAmount/txsToSign are (correctly)
  // summed/concatenated across all legs - merge them so the displayed route accounts for the
  // full split.
  const combinedHops: biatecRouter.HopExecution[] = routes.flatMap(
    (r) => r.route?.hops || [],
  );
  const combinedTxsToSign: string[] = routes.flatMap((r) => r.txsToSign || []);
  const route: biatecRouter.QuoteRoute = {
    ...routes[0]?.route,
    hops: combinedHops,
    inputAmount: totalInputAmount,
    outputAmount: totalOutputAmount,
    totalNetworkFeeMicroAlgos: totalFees,
  };
  return {
    route,
    txsToSign: combinedTxsToSign,
  };
}
