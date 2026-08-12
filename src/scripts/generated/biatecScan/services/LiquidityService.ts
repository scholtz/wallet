/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Liquidity } from '../models/Liquidity';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class LiquidityService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get liquidity updates with optional filtering and pagination.
     * @returns Liquidity OK
     * @throws ApiError
     */
    public getApiLiquidity({
        assetIdA,
        assetIdB,
        txId,
        poolAddress,
        poolAppId,
        offset,
        size = 100,
    }: {
        /**
         * Filter by asset A ID. When used alone, matches liquidity where this asset is either A or B.
         */
        assetIdA?: number,
        /**
         * Filter by asset B ID. When used with assetIdA, requires exact asset pair match.
         */
        assetIdB?: number,
        /**
         * Filter by transaction ID. Takes precedence over asset filters.
         */
        txId?: string,
        /**
         * Filter by pool escrow address.
         */
        poolAddress?: string,
        /**
         * Filter by pool application ID.
         */
        poolAppId?: number,
        /**
         * Number of records to skip for pagination (default: 0).
         */
        offset?: number,
        /**
         * Maximum number of records to return (default: 100, max: 500).
         */
        size?: number,
    }): CancelablePromise<Array<Liquidity>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/liquidity',
            query: {
                'assetIdA': assetIdA,
                'assetIdB': assetIdB,
                'txId': txId,
                'poolAddress': poolAddress,
                'poolAppId': poolAppId,
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
