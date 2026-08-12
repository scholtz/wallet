/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimeseriesCandles } from './TimeseriesCandles';
/**
 * 7 day hourly history for one asset: USD price OHLC candles (from trade OHLC aggregates) and
 * real TVL OHLC candles (from the hourly Redis TVL snapshots). Cached in Redis and refreshed on
 * a 1 hour cadence, so consumers may treat it as immutable within the hour.
 */
export type AssetTimeseries7D = {
    /**
     * ASA id (0 = ALGO).
     */
    assetId?: number;
    /**
     * Hourly USD price OHLC candles for the last 7 days. Empty when the asset had no priced trades.
     */
    price?: TimeseriesCandles;
    /**
     * Hourly real TVL (USD) OHLC candles for the last 7 days. Grows as snapshots accumulate.
     */
    tvl?: TimeseriesCandles;
    /**
     * When this series was computed.
     */
    generatedAt?: string;
};

