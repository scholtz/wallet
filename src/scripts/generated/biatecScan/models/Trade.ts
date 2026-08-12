/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DEXProtocol } from './DEXProtocol';
import type { TxState } from './TxState';
export type Trade = {
    assetIdIn?: number;
    assetIdOut?: number;
    assetAmountIn?: number;
    assetAmountOut?: number;
    txId?: string | null;
    blockId?: number;
    txGroup?: string | null;
    timestamp?: string | null;
    protocol?: DEXProtocol;
    trader?: string | null;
    poolAddress?: string | null;
    poolAppId?: number;
    topTxId?: string | null;
    tradeState?: TxState;
    'a'?: number;
    'b'?: number;
    'l'?: number;
    af?: number | null;
    bf?: number | null;
    valueUSD?: number | null;
    priceAssetInUSD?: number | null;
    priceAssetOutUSD?: number | null;
    feesUSD?: number | null;
    feesUSDProvider?: number | null;
    feesUSDProtocol?: number | null;
};

