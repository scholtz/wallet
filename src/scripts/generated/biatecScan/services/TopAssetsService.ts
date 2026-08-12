/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TopAssetsResponse } from '../models/TopAssetsResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class TopAssetsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get the "top assets" highlight lists for the scan homepage header: Popular (24h volume),
     * Trending (1h volume), Top gainers/losers (24h price change in percent) and Top liquidity
     * gainers/losers (24h real TVL change in percent). Candidates are the top 150 assets by real TVL excluding stable assets;
     * each list holds up to 3 entries. The response is recomputed every 5 minutes and served from
     * the Redis cache in between.
     * @returns TopAssetsResponse OK
     * @throws ApiError
     */
    public getApiAssetTop(): CancelablePromise<TopAssetsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/asset/top',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
