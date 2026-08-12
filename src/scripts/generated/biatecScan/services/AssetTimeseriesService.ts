/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetTimeseries7D } from '../models/AssetTimeseries7D';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AssetTimeseriesService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get the 7 day hourly timeseries (USD price OHLC and real TVL OHLC candles) for up to 100
     * assets at once, for the sparkline/candle columns on the asset and pool list pages. Series
     * are recomputed on a 1 hour cadence and served from the Redis cache in between, so this
     * endpoint is cheap to call for a whole page of assets.
     * @returns AssetTimeseries7D OK
     * @throws ApiError
     */
    public getApiAssetTimeseries7D({
        assetIds,
    }: {
        /**
         * Comma separated list of asset IDs (0 = ALGO). Max 100 per request.
         */
        assetIds?: string,
    }): CancelablePromise<Array<AssetTimeseries7D>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/asset/timeseries/7d',
            query: {
                'assetIds': assetIds,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
