/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BiatecAsset } from '../models/BiatecAsset';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AssetService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * List assets from the in-memory cache (prefilled from Redis) or filter by IDs / search term.
     * @returns BiatecAsset OK
     * @throws ApiError
     */
    public getApiAsset({
        ids,
        search,
        offset,
        size = 100,
    }: {
        /**
         * Comma separated list of asset IDs to include. Missing IDs will be fetched on-demand.
         */
        ids?: string,
        /**
         * Case-insensitive substring filter applied to asset name or unit name. Special case: utility returns utility tokens. Special case: stable returns the assets with stabilityIndex > 0.
         */
        search?: string,
        /**
         * Number of records to skip for pagination (default: 0).
         */
        offset?: number,
        /**
         * Maximum number of results to return (default 100, max 500).
         */
        size?: number,
    }): CancelablePromise<Array<BiatecAsset>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/asset',
            query: {
                'ids': ids,
                'search': search,
                'offset': offset,
                'size': size,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Returns the cached PNG image for the given asset id. Intentionally public (no authentication
     * required) so it can be embedded directly as an <img> src in browsers/clients without an
     * ARC-14 signed transaction.
     * @returns binary OK
     * @throws ApiError
     */
    public getApiAssetImage({
        assetId,
    }: {
        /**
         * Algorand asset id to fetch the image for.
         */
        assetId: number,
    }): CancelablePromise<Blob> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/asset/image/{assetId}',
            path: {
                'assetId': assetId,
            },
        });
    }
}
