/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class OhlcService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Returns the TradingView UDF datafeed configuration (supported resolutions, exchanges, symbol types).
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcConfig(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/config',
        });
    }
    /**
     * Returns the current server time as a Unix timestamp, used by TradingView for datafeed sync.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcTime(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/time',
        });
    }
    /**
     * Resolves a single symbol (e.g. "31566704_0") to its TradingView symbol info.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcSymbols({
        symbol,
    }: {
        /**
         * Underscore-separated asset id pair, e.g. "assetA_assetB".
         */
        symbol?: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/symbols',
            query: {
                'symbol': symbol,
            },
        });
    }
    /**
     * Resolves a comma separated group of symbols to their TradingView symbol info in bulk.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcSymbolInfo({
        group,
    }: {
        /**
         * Comma separated list of underscore-separated asset id pairs.
         */
        group?: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/symbol_info',
            query: {
                'group': group,
            },
        });
    }
    /**
     * Searches for tradable symbols (asset pairs) matching a free-text query, for the TradingView symbol search box.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcSearch({
        query,
        type,
        limit = 30,
    }: {
        /**
         * Free-text search term (asset name/unit name).
         */
        query?: string,
        /**
         * Optional symbol type filter.
         */
        type?: string,
        /**
         * Maximum number of results to return (default 30).
         */
        limit?: number,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/search',
            query: {
                'query': query,
                'type': type,
                'limit': limit,
            },
        });
    }
    /**
     * Returns chart marks (annotations) for the TradingView datafeed. Currently always empty.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcMarks(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/marks',
        });
    }
    /**
     * Returns timescale marks for the TradingView datafeed. Currently always empty.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcTimescaleMarks(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/timescale_marks',
        });
    }
    /**
     * Returns last-quote snapshots for the given symbols, for the TradingView quotes API.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcQuotes({
        symbols,
    }: {
        /**
         * Comma separated list of underscore-separated asset id pairs.
         */
        symbols?: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/quotes',
            query: {
                'symbols': symbols,
            },
        });
    }
    /**
     * Returns OHLCV bars for an asset pair over a time range, for the TradingView history API.
     * @returns any OK
     * @throws ApiError
     */
    public getApiOhlcHistory({
        assetA,
        assetB,
        resolution,
        from,
        to,
    }: {
        /**
         * First asset id of the pair.
         */
        assetA?: number,
        /**
         * Second asset id of the pair.
         */
        assetB?: number,
        /**
         * TradingView resolution string (e.g. "1", "60", "1D").
         */
        resolution?: string,
        /**
         * Range start, Unix timestamp (seconds).
         */
        from?: number,
        /**
         * Range end, Unix timestamp (seconds).
         */
        to?: number,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/OHLC/history',
            query: {
                'assetA': assetA,
                'assetB': assetB,
                'resolution': resolution,
                'from': from,
                'to': to,
            },
        });
    }
}
