/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AMMType } from './AMMType';
import type { DEXProtocol } from './DEXProtocol';
export type Pool = {
    poolAddress?: string | null;
    poolAppId?: number;
    assetIdA?: number | null;
    assetADecimals?: number | null;
    assetIdB?: number | null;
    assetBDecimals?: number | null;
    assetIdLP?: number | null;
    'a'?: number | null;
    'b'?: number | null;
    stableA?: number | null;
    stableB?: number | null;
    amplifier?: number | null;
    af?: number | null;
    bf?: number | null;
    'l'?: number | null;
    pMin?: number | null;
    pMax?: number | null;
    verificationClass?: number | null;
    protocol?: DEXProtocol;
    timestamp?: string | null;
    ammType?: AMMType;
    approvalProgramHash?: string | null;
    lpFee?: number | null;
    protocolFeePortion?: number | null;
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
    readonly virtualAmountA?: number;
    readonly virtualAmountAForPrice?: number;
    readonly realAmountA?: number;
    readonly virtualAmountB?: number;
    readonly virtualAmountBForPrice?: number;
    readonly hasZeroWidthPriceRange?: boolean;
    readonly realAmountB?: number;
};

