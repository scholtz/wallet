/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetParams } from './AssetParams';
import type { AssetType } from './AssetType';
export type BiatecAsset = {
    index: number;
    params: AssetParams;
    type?: AssetType;
    priceUSD?: number;
    stabilityIndex?: number;
    tvL_USD?: number;
    timestamp?: string | null;
    totalTVLAssetInUSD?: number | null;
    volume1H?: number | null;
    volume24H?: number | null;
    volume7D?: number | null;
    priceUSD1H?: number | null;
    priceUSD24H?: number | null;
    priceUSD7D?: number | null;
    poolsCount?: number;
    deleted?: boolean;
};

