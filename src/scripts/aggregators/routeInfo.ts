// scripts/aggregators/routeInfo.ts - Normalizes each DEX aggregator's raw quote
// response into a common shape the swap route visualization can render, without
// any Vue/store dependency so it stays easy to unit-reason about and reuse.

export interface RoutePoolInfo {
  label: string;
  protocol?: string;
  poolAppId?: number;
  poolAddress?: string;
  fromAssetId: number;
  toAssetId: number;
  amountIn?: number;
  amountOut?: number;
  networkFeeMicroAlgos?: number;
  percentage?: number;
}

export interface RouteHopInfo {
  fromAssetId: number;
  toAssetId: number;
  inputAmount?: number;
  outputAmount?: number;
  pools: RoutePoolInfo[];
}

export interface RoutePathInfo {
  percentage?: number;
  hops: RouteHopInfo[];
}

export type RouteNoteCode = "no-detailed-route" | "no-pool-breakdown";

export interface AggregatorRouteInfo {
  available: boolean;
  fromAssetId: number;
  toAssetId: number;
  inputAmount?: number;
  outputAmount?: number;
  priceImpactPercent?: number;
  networkFeeMicroAlgos?: number;
  paths: RoutePathInfo[];
  steps?: string[];
  note?: RouteNoteCode;
}

function emptyRoute(fromAssetId: number, toAssetId: number): AggregatorRouteInfo {
  return { available: false, fromAssetId, toAssetId, paths: [] };
}

export function buildDeflexRouteInfo(
  quotes: any,
  txs: any,
  fromAssetId: number,
  toAssetId: number,
  inputAmount: number
): AggregatorRouteInfo {
  if (!quotes || (quotes.quote === undefined && !quotes.route)) {
    return emptyRoute(fromAssetId, toAssetId);
  }

  const steps: string[] = Array.isArray(txs?.groupMetadata)
    ? txs.groupMetadata.map((g: any) => g?.labelText).filter(Boolean)
    : [];

  const rawRoutes = Array.isArray(quotes.route) ? quotes.route : [];
  const paths: RoutePathInfo[] = rawRoutes.map((r: any) => ({
    percentage: typeof r?.percentage === "number" ? r.percentage : undefined,
    hops: Array.isArray(r?.path)
      ? r.path.map((el: any) => {
          const hopFrom = typeof el?.in?.id === "number" ? el.in.id : fromAssetId;
          const hopTo = typeof el?.out?.id === "number" ? el.out.id : toAssetId;
          return {
            fromAssetId: hopFrom,
            toAssetId: hopTo,
            pools: [
              {
                label: el?.name || "Unknown protocol",
                protocol: el?.name,
                fromAssetId: hopFrom,
                toAssetId: hopTo,
              },
            ],
          };
        })
      : [],
  }));

  return {
    available: true,
    fromAssetId,
    toAssetId,
    inputAmount,
    outputAmount: quotes.quote !== undefined ? Number(quotes.quote) : undefined,
    priceImpactPercent:
      typeof quotes.userPriceImpact === "number"
        ? quotes.userPriceImpact * 100
        : undefined,
    paths,
    steps,
    note: paths.length === 0 ? "no-detailed-route" : undefined,
  };
}

export function buildFolksRouteInfo(
  quote: any,
  fromAssetId: number,
  toAssetId: number,
  inputAmount: number
): AggregatorRouteInfo {
  if (!quote || quote.quoteAmount === undefined) {
    return emptyRoute(fromAssetId, toAssetId);
  }

  const outputAmount = Number(quote.quoteAmount);

  return {
    available: true,
    fromAssetId,
    toAssetId,
    inputAmount,
    outputAmount,
    priceImpactPercent:
      typeof quote.priceImpact === "number" ? quote.priceImpact * 100 : undefined,
    networkFeeMicroAlgos:
      typeof quote.microalgoTxnsFee === "number" ? quote.microalgoTxnsFee : undefined,
    paths: [
      {
        percentage: 100,
        hops: [
          {
            fromAssetId,
            toAssetId,
            inputAmount,
            outputAmount,
            pools: [
              {
                label: "Folks Router (aggregated)",
                protocol: "Folks Router",
                fromAssetId,
                toAssetId,
                amountIn: inputAmount,
                amountOut: outputAmount,
              },
            ],
          },
        ],
      },
    ],
    note: "no-pool-breakdown",
  };
}

export function buildBiatecRouteInfo(
  biatecQuotes: any,
  fromAssetId: number,
  toAssetId: number
): AggregatorRouteInfo {
  const route = biatecQuotes?.route?.route;
  if (!route) {
    return emptyRoute(fromAssetId, toAssetId);
  }

  const hops: RouteHopInfo[] = Array.isArray(route.hops)
    ? route.hops.map((hop: any) => {
        const hopFrom = typeof hop?.fromAsset === "number" ? hop.fromAsset : fromAssetId;
        const hopTo = typeof hop?.toAsset === "number" ? hop.toAsset : toAssetId;
        const pools: RoutePoolInfo[] = Array.isArray(hop?.pools)
          ? hop.pools.map((p: any) => ({
              label: p?.protocol || "Pool",
              protocol: p?.protocol,
              poolAppId: p?.poolAppId,
              poolAddress: p?.poolAppAddress ?? undefined,
              fromAssetId: hopFrom,
              toAssetId: hopTo,
              amountIn: p?.amountIn,
              amountOut: p?.amountOut,
              networkFeeMicroAlgos: p?.networkFeeMicroAlgos,
              percentage:
                hop?.inputAmount && p?.amountIn
                  ? (p.amountIn / hop.inputAmount) * 100
                  : undefined,
            }))
          : [];
        return {
          fromAssetId: hopFrom,
          toAssetId: hopTo,
          inputAmount: hop?.inputAmount,
          outputAmount: hop?.outputAmount,
          pools,
        };
      })
    : [];

  return {
    available: hops.length > 0,
    fromAssetId: typeof route.fromAsset === "number" ? route.fromAsset : fromAssetId,
    toAssetId: typeof route.toAsset === "number" ? route.toAsset : toAssetId,
    inputAmount: route.inputAmount,
    outputAmount: route.outputAmount,
    networkFeeMicroAlgos: route.totalNetworkFeeMicroAlgos,
    paths: hops.length > 0 ? [{ percentage: 100, hops }] : [],
  };
}

export function collectRouteAssetIds(info: AggregatorRouteInfo): number[] {
  const ids = new Set<number>([info.fromAssetId, info.toAssetId]);
  for (const path of info.paths) {
    for (const hop of path.hops) {
      ids.add(hop.fromAssetId);
      ids.add(hop.toAssetId);
      for (const pool of hop.pools) {
        ids.add(pool.fromAssetId);
        ids.add(pool.toAssetId);
      }
    }
  }
  return [...ids];
}
