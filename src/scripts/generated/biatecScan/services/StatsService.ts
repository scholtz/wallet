/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DexStatsResponse } from '../models/DexStatsResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class StatsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Returns aggregated 24-hour DEX statistics (volume, fees) for the given protocol starting at
     * timestamp. The query window is [timestamp, timestamp + 1 day).
     * Only confirmed trades are included. Suitable for DefiLlama adapter consumption.
     * @returns DexStatsResponse OK
     * @throws ApiError
     */
    public getApiStatsDex({
        dex,
        timestamp,
    }: {
        /**
         * DEX protocol identifier: `Biatec`, `Pact`, or `Tiny`.
         */
        dex?: string,
        /**
         * Inclusive start of the 24-hour statistics window.
         */
        timestamp?: string,
    }): CancelablePromise<DexStatsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/Stats/dex',
            query: {
                'dex': dex,
                'timestamp': timestamp,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
}
