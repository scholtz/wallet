/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GossipRelayStatus } from '../models/GossipRelayStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GossipService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Returns the set of gossip relays currently connected (or being connected to), along with how many
     * mempool messages each has delivered and when it last delivered one.
     * @returns GossipRelayStatus OK
     * @throws ApiError
     */
    public getApiGossipStatus(): CancelablePromise<Array<GossipRelayStatus>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/Gossip/status',
        });
    }
}
