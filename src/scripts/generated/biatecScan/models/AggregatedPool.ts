/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AggregatedPool = {
    readonly id?: string | null;
    assetIdA?: number;
    assetIdB?: number;
    virtualSumALevel1?: number;
    virtualSumBLevel1?: number;
    virtualSumALevel1ForPrice?: number | null;
    virtualSumBLevel1ForPrice?: number | null;
    virtualSumALevel2?: number;
    virtualSumBLevel2?: number;
    tvL_A?: number;
    tvL_B?: number;
    poolCount?: number;
    level1Pools?: any[] | null;
    level2Pools?: any[] | null;
    lastUpdated?: string | null;
    readonly virtualSumA?: number;
    readonly virtualSumB?: number;
    totalTVLAssetAInUSD?: number | null;
    totalTVLAssetBInUSD?: number | null;
    volume1H?: number | null;
    volume24H?: number | null;
    volume7D?: number | null;
    priceAUSD1H?: number | null;
    priceAUSD24H?: number | null;
    priceAUSD7D?: number | null;
    priceBUSD1H?: number | null;
    priceBUSD24H?: number | null;
    priceBUSD7D?: number | null;
};

