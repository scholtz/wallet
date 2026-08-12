/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DEXProtocol } from './DEXProtocol';
export type AssetStat = {
    assetId?: number;
    protocol?: DEXProtocol;
    readonly id?: string | null;
    assetName?: string | null;
    unitName?: string | null;
    decimals?: number | null;
    imageUrl?: string | null;
    priceUSD?: number | null;
    tvlusd?: number;
    tvlOtherUSD?: number;
    volume24hUSD?: number;
    volume7dUSD?: number;
    fees24hUSD?: number;
    fees7dUSD?: number;
    apr24h?: number;
    apr7d?: number;
    poolCount?: number;
    lastUpdated?: string;
};

