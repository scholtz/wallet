/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Backend-computed "top assets" highlight lists shown at the top of the Biatec Scan UI.
 * The candidate universe for every list is the top 150 assets ordered by real TVL (BiatecAsset.TVL_USD).
 * Stable/base reference assets (StabilityIndex > 0, e.g. ALGO and USDC) are excluded from the
 * volume-ranked lists (Popular, Trending) but compete normally in the price and liquidity
 * gainers/losers lists. Each list contains up to 3 entries. The response is recomputed and cached in Redis every 5 minutes
 * (see TopAssetsBackgroundService), so it is served mostly from cache.
 */
export type TopAssetsResponse = {
    /**
     * Top assets by 24h trading volume ("Popular assets").
     */
    popular?: any[] | null;
    /**
     * Top assets by 1h trading volume ("Trending assets").
     */
    trending?: any[] | null;
    /**
     * Top assets by 24h price growth in percent ("Top gainers"). Only positive changes qualify.
     */
    topGainers?: any[] | null;
    /**
     * Top assets by 24h price loss in percent ("Top losers"). Only negative changes qualify.
     */
    topLosers?: any[] | null;
    /**
     * Top assets by relative real TVL growth in percent over 24h ("Top liquidity gainers"). Only positive changes qualify.
     * Newly funded assets (no TVL 24h ago) count as infinite relative growth: they rank first, ordered by absolute USD gain, with TVLChange24HPercent null.
     */
    topValueGainers?: any[] | null;
    /**
     * Top assets by relative real TVL loss in percent over 24h ("Top liquidity losers"). Only negative changes qualify.
     */
    topValueLosers?: any[] | null;
    /**
     * Timestamp this response was computed.
     */
    generatedAt?: string;
};

