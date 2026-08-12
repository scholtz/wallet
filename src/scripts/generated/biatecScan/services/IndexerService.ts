/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Indexer } from '../models/Indexer';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class IndexerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Gets the current indexer status
     * @returns Indexer OK
     * @throws ApiError
     */
    public getApiIndexerStatus(): CancelablePromise<Indexer> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/indexer/status',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
                404: `Not Found`,
            },
        });
    }
}
