/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Compact OHLC candle series in TradingView-style parallel arrays (all arrays share the same
 * length and index i describes one candle). Chosen over an array of candle objects to keep the
 * JSON payload small — the 7d asset timeseries endpoint returns up to ~168 hourly candles per
 * series for up to 100 assets per request.
 */
export type TimeseriesCandles = {
    /**
     * Bucket start times (unix seconds, UTC, ascending).
     */
    't'?: any[] | null;
    /**
     * Open values.
     */
    'o'?: any[] | null;
    /**
     * High values.
     */
    'h'?: any[] | null;
    /**
     * Low values.
     */
    'l'?: any[] | null;
    /**
     * Close values.
     */
    'c'?: any[] | null;
};

