/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AggregatedPool } from '../models/AggregatedPool';
import type { PoolOrderBy } from '../models/PoolOrderBy';
import type { SortDirection } from '../models/SortDirection';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AggregatedPoolService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get all aggregated pools or filter by asset ids. An asset id filter matches the asset on either side of the pair.
     * @returns AggregatedPool OK
     * @throws ApiError
     */
    public getApiAggregatedPool({
        assetIdA,
        assetIdB,
        offset,
        size = 100,
        orderBy,
        direction,
        light = false,
    }: {
        /**
         * Optional asset filter; matches pairs containing this asset on either side
         */
        assetIdA?: number,
        /**
         * Optional asset filter; matches pairs containing this asset on either side
         */
        assetIdB?: number,
        /**
         * Number of pools to skip (default: 0)
         */
        offset?: number,
        /**
         * Number of pools to return (default: 100)
         */
        size?: number,
        /**
         * Server-side ordering (default: TVL) so that size/offset return the top items. Options: TVL, Volume1H, Volume24H, Volume7D, LastUpdated, PoolCount
         */
        orderBy?: PoolOrderBy,
        /**
         * Sort direction (default: Desc)
         */
        direction?: SortDirection,
        /**
         * When true, omits the level1Pools/level2Pools collections from the response to reduce payload size
         */
        light?: boolean,
    }): CancelablePromise<Array<AggregatedPool>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/aggregated-pool',
            query: {
                'assetIdA': assetIdA,
                'assetIdB': assetIdB,
                'offset': offset,
                'size': size,
                'orderBy': orderBy,
                'direction': direction,
                'light': light,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Update and retrieve aggregated pool
     * @returns AggregatedPool OK
     * @throws ApiError
     */
    public getApiAggregatedPoolReload({
        assetIdA,
        assetIdB,
    }: {
        assetIdA?: number,
        assetIdB?: number,
    }): CancelablePromise<AggregatedPool> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/aggregated-pool/reload',
            query: {
                'assetIdA': assetIdA,
                'assetIdB': assetIdB,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
