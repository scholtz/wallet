/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DEXProtocol } from '../models/DEXProtocol';
import type { TradePagedResult } from '../models/TradePagedResult';
import type { TxState } from '../models/TxState';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class TradeService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get trades with optional filtering and pagination.
     * @returns TradePagedResult OK
     * @throws ApiError
     */
    public getApiTrade({
        assetIdIn,
        assetIdOut,
        assetId,
        assetIdA,
        assetIdB,
        txId,
        trader,
        poolAddress,
        poolAppId,
        protocol,
        tradeState,
        blockFrom,
        blockTo,
        timestampFrom,
        timestampTo,
        minValueUsd,
        maxValueUsd,
        minFeesUsd,
        maxFeesUsd,
        minAmountIn,
        maxAmountIn,
        minAmountOut,
        maxAmountOut,
        sortBy,
        sortDirection,
        offset,
        size = 100,
    }: {
        /**
         * Filter by input asset ID. When used alone, matches trades where this asset is either input or output.
         */
        assetIdIn?: number,
        /**
         * Filter by output asset ID. When used with assetIdIn, requires exact asset pair match.
         */
        assetIdOut?: number,
        /**
         * Filter by asset ID on either side of the trade.
         */
        assetId?: number,
        /**
         * Filter unordered pair asset A.
         */
        assetIdA?: number,
        /**
         * Filter unordered pair asset B.
         */
        assetIdB?: number,
        /**
         * Filter by transaction ID. Takes precedence over asset filters.
         */
        txId?: string,
        /**
         * Filter by trader address.
         */
        trader?: string,
        /**
         * Filter by pool address.
         */
        poolAddress?: string,
        /**
         * Filter by pool application ID.
         */
        poolAppId?: number,
        /**
         * Filter by DEX protocol.
         */
        protocol?: DEXProtocol,
        /**
         * Filter by trade state.
         */
        tradeState?: TxState,
        /**
         * Filter by minimum block.
         */
        blockFrom?: number,
        /**
         * Filter by maximum block.
         */
        blockTo?: number,
        /**
         * Filter by minimum timestamp.
         */
        timestampFrom?: string,
        /**
         * Filter by maximum timestamp.
         */
        timestampTo?: string,
        /**
         * Filter by minimum USD value.
         */
        minValueUsd?: number,
        /**
         * Filter by maximum USD value.
         */
        maxValueUsd?: number,
        /**
         * Filter by minimum USD fees.
         */
        minFeesUsd?: number,
        /**
         * Filter by maximum USD fees.
         */
        maxFeesUsd?: number,
        /**
         * Filter by minimum input amount.
         */
        minAmountIn?: number,
        /**
         * Filter by maximum input amount.
         */
        maxAmountIn?: number,
        /**
         * Filter by minimum output amount.
         */
        minAmountOut?: number,
        /**
         * Filter by maximum output amount.
         */
        maxAmountOut?: number,
        /**
         * Sort by timestamp, valueUSD, feesUSD, assetAmountIn, or assetAmountOut.
         */
        sortBy?: string,
        /**
         * Sort direction: asc or desc.
         */
        sortDirection?: string,
        /**
         * Number of records to skip for pagination (default: 0).
         */
        offset?: number,
        /**
         * Maximum number of records to return (default: 100, max: 500).
         */
        size?: number,
    }): CancelablePromise<TradePagedResult> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/trade',
            query: {
                'assetIdIn': assetIdIn,
                'assetIdOut': assetIdOut,
                'assetId': assetId,
                'assetIdA': assetIdA,
                'assetIdB': assetIdB,
                'txId': txId,
                'trader': trader,
                'poolAddress': poolAddress,
                'poolAppId': poolAppId,
                'protocol': protocol,
                'tradeState': tradeState,
                'blockFrom': blockFrom,
                'blockTo': blockTo,
                'timestampFrom': timestampFrom,
                'timestampTo': timestampTo,
                'minValueUSD': minValueUsd,
                'maxValueUSD': maxValueUsd,
                'minFeesUSD': minFeesUsd,
                'maxFeesUSD': maxFeesUsd,
                'minAmountIn': minAmountIn,
                'maxAmountIn': maxAmountIn,
                'minAmountOut': minAmountOut,
                'maxAmountOut': maxAmountOut,
                'sortBy': sortBy,
                'sortDirection': sortDirection,
                'offset': offset,
                'size': size,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
