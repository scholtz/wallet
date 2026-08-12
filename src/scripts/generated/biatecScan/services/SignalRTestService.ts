/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SignalRTestService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Returns the caller's current authentication state and claims, for debugging ARC-14 auth.
     * @returns any OK
     * @throws ApiError
     */
    public getApiSignalrAuthTest(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/signalr/auth-test',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Same as M:AVMTradeReporter.Controllers.SignalRTestController.AuthTest but forces authorization at the action level (redundant given the class-level [Authorize], kept explicit for clarity/testing).
     * @returns any OK
     * @throws ApiError
     */
    public getApiSignalrAuthTestAuthorized(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/signalr/auth-test-authorized',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Broadcasts a test info message to all connected SignalR clients.
     * @returns any OK
     * @throws ApiError
     */
    public postApiSignalrTestBroadcast({
        requestBody,
    }: {
        /**
         * Free-text message to broadcast.
         */
        requestBody?: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/signalr/test-broadcast',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Broadcasts a synthetic test trade to all connected SignalR clients, for verifying the trade event pipeline end to end.
     * @returns any OK
     * @throws ApiError
     */
    public postApiSignalrTestTrade(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/signalr/test-trade',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
    /**
     * Returns the current count and list of active SignalR hub subscriptions.
     * @returns any OK
     * @throws ApiError
     */
    public getApiSignalrConnections(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/signalr/connections',
            errors: {
                401: `Unauthorized`,
                403: `Forbidden`,
            },
        });
    }
}
