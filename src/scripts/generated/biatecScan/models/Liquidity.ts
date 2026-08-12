/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DEXProtocol } from './DEXProtocol';
import type { LiquidityDirection } from './LiquidityDirection';
import type { TxState } from './TxState';
export type Liquidity = {
    direction?: LiquidityDirection;
    assetIdA?: number;
    assetIdB?: number;
    assetIdLP?: number;
    assetAmountA?: number;
    assetAmountB?: number;
    assetAmountLP?: number;
    'a'?: number;
    'b'?: number;
    af?: number | null;
    bf?: number | null;
    'l'?: number;
    txId?: string | null;
    blockId?: number;
    txGroup?: string | null;
    timestamp?: string | null;
    protocol?: DEXProtocol;
    liquidityProvider?: string | null;
    poolAddress?: string | null;
    poolAppId?: number;
    topTxId?: string | null;
    txState?: TxState;
    valueUSD?: number | null;
};

