/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetStat } from '../models/AssetStat';
import type { DEXProtocol } from '../models/DEXProtocol';
import type { SortDirection } from '../models/SortDirection';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AssetStatService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get backend-computed per-asset TVL/volume/fees/APR stats, optionally filtered by protocol.
     * @returns AssetStat OK
     * @throws ApiError
     */
    public getApiAssetStat({
        protocol,
        sortBy = 'TVLUSD',
        direction,
    }: {
        /**
         * Optional protocol filter (Pact, Tiny, Biatec). When omitted, both the
         * combined ("all protocols") rows and the per-protocol rows are returned.
         */
        protocol?: DEXProtocol,
        /**
         * Optional sort field: TVLUSD, Volume24hUSD, Volume7dUSD, Apr24h, Apr7d. Defaults to TVLUSD.
         */
        sortBy?: string,
        /**
         * Sort direction (default: Desc)
         */
        direction?: SortDirection,
    }): CancelablePromise<Array<AssetStat>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/asset-stat',
            query: {
                'protocol': protocol,
                'sortBy': sortBy,
                'direction': direction,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Get the stat row for a single asset, optionally scoped to a protocol.
     * @returns AssetStat OK
     * @throws ApiError
     */
    public getApiAssetStat1({
        assetId,
        protocol,
    }: {
        /**
         * Asset id to look up
         */
        assetId: number,
        /**
         * Optional protocol filter; omit for the combined ("all protocols") row.
         */
        protocol?: DEXProtocol,
    }): CancelablePromise<AssetStat> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/asset-stat/{assetId}',
            path: {
                'assetId': assetId,
            },
            query: {
                'protocol': protocol,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
