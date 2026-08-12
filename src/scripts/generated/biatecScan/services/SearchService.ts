/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SearchResponse } from '../models/SearchResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SearchService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Searches assets and pools matching the given query term.
     * @returns SearchResponse OK
     * @throws ApiError
     */
    public getApiSearch({
        q,
    }: {
        /**
         * Free-text search term (asset name, unit name, or pool address).
         */
        q?: string,
    }): CancelablePromise<SearchResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/search',
            query: {
                'q': q,
            },
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
