/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DEXProtocol } from '../models/DEXProtocol';
import type { Pool } from '../models/Pool';
import type { PoolOrderBy } from '../models/PoolOrderBy';
import type { SortDirection } from '../models/SortDirection';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PoolService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get all pools or filter by protocol
     * @returns Pool OK
     * @throws ApiError
     */
    public getApiPool({
        assetIdA,
        assetIdB,
        address,
        protocol,
        size = 100,
        orderBy,
        direction,
    }: {
        /**
         * Filter by asset A ID. When used alone, matches pools where this asset is either A or B.
         */
        assetIdA?: number,
        /**
         * Filter by asset B ID. When used with assetIdA, requires exact asset pair match.
         */
        assetIdB?: number,
        /**
         * Filter by pool escrow address.
         */
        address?: string,
        /**
         * Optional protocol filter (Pact, Tiny, Biatec)
         */
        protocol?: DEXProtocol,
        /**
         * Number of pools to return (default: 100)
         */
        size?: number,
        /**
         * Optional server-side ordering (TVL, Volume1H, Volume24H, Volume7D, LastUpdated). Defaults to LastUpdated (timestamp descending)
         */
        orderBy?: PoolOrderBy,
        /**
         * Sort direction (default: Desc)
         */
        direction?: SortDirection,
    }): CancelablePromise<Array<Pool>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/pool',
            query: {
                'assetIdA': assetIdA,
                'assetIdB': assetIdB,
                'address': address,
                'protocol': protocol,
                'size': size,
                'orderBy': orderBy,
                'direction': direction,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Get pool statistics
     * @returns any OK
     * @throws ApiError
     */
    public getApiPoolStats({
        assetIdA,
        assetIdB,
    }: {
        assetIdA?: number,
        assetIdB?: number,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/pool/stats',
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
    /**
     * Get pool statistics
     * @returns any OK
     * @throws ApiError
     */
    public getApiPoolReload({
        protocol,
        poolId,
        poolAddress,
    }: {
        protocol?: DEXProtocol,
        poolId?: number,
        poolAddress?: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/pool/reload',
            query: {
                'protocol': protocol,
                'poolId': poolId,
                'poolAddress': poolAddress,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
