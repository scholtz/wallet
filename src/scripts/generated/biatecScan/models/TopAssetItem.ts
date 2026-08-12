/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One asset entry inside AVMTradeReporter.Model.DTO.TopAssetsResponse lists.
 */
export type TopAssetItem = {
    /**
     * Algorand asset id.
     */
    assetId?: number;
    /**
     * Asset display name.
     */
    name?: string | null;
    /**
     * Asset unit name (ticker).
     */
    unitName?: string | null;
    /**
     * Number of decimals of the asset.
     */
    decimals?: number | null;
    /**
     * Current USD price of the asset.
     */
    priceUSD?: number;
    /**
     * USD price 24 hours ago (null when no history is available yet).
     */
    priceUSD24H?: number | null;
    /**
     * Price change over the past 24 hours in percent (null when no price history).
     */
    priceChange24HPercent?: number | null;
    /**
     * Trading volume in USD over the past hour.
     */
    volume1HUSD?: number;
    /**
     * Trading volume in USD over the previous hour window (2h ago .. 1h ago). Null when trade history was unavailable during computation.
     */
    volume1HUSDPrev?: number | null;
    /**
     * Volume change of the past-hour window vs the previous-hour window in percent (null when the previous window had no volume).
     */
    volume1HChangePercent?: number | null;
    /**
     * Trading volume in USD over the past 24 hours.
     */
    volume24HUSD?: number;
    /**
     * Trading volume in USD over the previous 24h window (48h ago .. 24h ago). Null when trade history was unavailable during computation.
     */
    volume24HUSDPrev?: number | null;
    /**
     * Volume change of the past-24h window vs the previous-24h window in percent (null when the previous window had no volume).
     */
    volume24HChangePercent?: number | null;
    /**
     * Current real TVL in USD (trusted-token side only, see BiatecAsset.TVL_USD).
     */
    realTVLUSD?: number;
    /**
     * Real TVL in USD ~24 hours ago (null when no snapshot history is available yet).
     */
    realTVLUSD24H?: number | null;
    /**
     * Absolute real TVL change over the past 24 hours in USD (null when no snapshot history).
     */
    tvlChange24HUSD?: number | null;
    /**
     * Real TVL change over the past 24 hours in percent (null when no snapshot history).
     */
    tvlChange24HPercent?: number | null;
};

