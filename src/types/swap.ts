// types/swap.ts - Type definitions for the Swap component

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

// Minimal slice of the app's real Vuex store (see src/store/index.ts's
// RootState) that the swap aggregators actually read - only
// state.config.{env,tokenSymbol,deflex} are ever accessed via context.$store
// in src/scripts/aggregators/*.ts.
export interface SwapStore {
  state: {
    config: {
      env: string;
      tokenSymbol: string;
      deflex: string;
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
}

export interface SwapMethods {
  openSuccess: (_message: string) => void;
  openError: (_message: string) => void;
  getSK: (_config: { addr: string }) => Promise<Uint8Array>;
  getAsset: (_config: { assetIndex: number }) => Promise<StoredAsset>;
  sendRawTransaction: (_config: {
    signedTxn: Uint8Array | Uint8Array[];
  }) => Promise<algosdk.modelsv2.PostTransactionsResponse>;
  waitForConfirmation: (_config: {
    txId: string;
    timeout: number;
  }) => Promise<algosdk.modelsv2.PendingTransactionResponse | undefined>;
  prolong: () => Promise<void>;
  reloadAccount: () => Promise<void>;
  checkNetwork: () => string | false;
}
