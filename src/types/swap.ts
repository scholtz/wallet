// types/swap.ts - Type definitions for the Swap component
/* eslint-disable no-unused-vars */

import { StoredAsset } from "@/store/indexer";
import algosdk from "algosdk";

export interface AccountData {
  amount: number;
  assets: Array<{
    assetId: bigint;
    amount: bigint;
  }>;
}

export interface Account {
  addr: string;
  data?: {
    [env: string]: AccountData;
  };
}

export interface SwapStore {
  state: {
    config: {
      env: string;
      tokenSymbol: string;
      deflex: string;
    };
    algod: {
      client: any;
    };
    wallet: {
      privateAccounts: Account[];
    };
  };
  getters: {
    algosdk: {
      decodeUnsignedTransaction: (_bytes: Uint8Array) => any;
      signTransaction: (_tx: any, _sk: Uint8Array) => any;
      computeGroupID: (_txs: any[]) => Uint8Array;
      waitForConfirmation: (
        _client: any,
        _txId: string,
        _timeout: number
      ) => Promise<any>;
    };
  };
}

export interface SwapRoute {
  params: {
    account: string;
    fromAsset?: string;
    toAsset?: string;
  };
}

export interface SwapComponentData {
  assets: StoredAsset[];
  asset: bigint | null;
  toAsset: bigint | null;
  payamount: number;
  fromAssetObj: StoredAsset | undefined;
  toAssetObj: StoredAsset | undefined;
  txsDetails: string;
  hasSK: boolean | null;
  processingQuote: boolean;
  processingOptin: boolean;
  note: string;
  error: string;
  slippage: number;
  fee: number;
  // Dynamic aggregator properties
  [key: string]: any;
}

export interface SwapMethods {
  openSuccess: (_message: string) => void;
  openError: (_message: string) => void;
  axiosGet: (_config: { url: string }) => Promise<any>;
  axiosPost: (_config: {
    url: string;
    body?: any;
    config?: any;
  }) => Promise<any>;
  getSK: (_config: { addr: string }) => Promise<Uint8Array>;
  getAsset: (_config: { assetIndex: number }) => Promise<StoredAsset>;
  sendRawTransaction: (_config: {
    signedTxn: Uint8Array | Uint8Array[];
  }) => Promise<algosdk.modelsv2.PostTransactionsResponse>;
  waitForConfirmation: (_config: {
    txId: string;
    timeout: number;
  }) => Promise<any>;
  prolong: () => Promise<void>;
  reloadAccount: () => Promise<void>;
  checkNetwork: () => string | false;
}

/* eslint-enable no-unused-vars */
