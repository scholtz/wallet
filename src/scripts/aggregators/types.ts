import { Ref } from "vue";
import { Asset, SwapStore, SwapRoute, Account } from "../../types/swap";
import { FolksRouterClient } from "@folks-router/js-sdk";

export interface SwapContext {
  // State (Refs)
  assets: Ref<Asset[]>;
  asset: Ref<number | null>;
  toAsset: Ref<number | null>;
  payamount: Ref<number>;
  fromAssetObj: Ref<Partial<Asset>>;
  toAssetObj: Ref<Partial<Asset>>;
  txsDetails: Ref<string>;
  hasSK: Ref<boolean | null>;
  processingQuote: Ref<boolean>;
  processingOptin: Ref<boolean>;
  note: Ref<string>;
  error: Ref<string>;
  slippage: Ref<number>;
  fee: Ref<number>;

  // Computed (Refs)
  account: Ref<Account | undefined>;
  fromAssetDecimals: Ref<number>;
  toAssetDecimals: Ref<number>;
  requiresOptIn: Ref<boolean>;

  // Store and Route
  $store: SwapStore;
  $route: SwapRoute;

  // Methods
  openSuccess: (message: string) => void;
  openError: (message: string) => void;
  axiosGet: (config: { url: string }) => Promise<any>;
  axiosPost: (config: {
    url: string;
    body?: any;
    config?: any;
  }) => Promise<any>;
  getSK: (config: { addr: string }) => Promise<Uint8Array>;
  getAsset: (config: { assetIndex: number }) => Promise<Asset>;
  sendRawTransaction: (config: {
    signedTxn: Uint8Array | Uint8Array[];
  }) => Promise<{ txId: string }>;
  waitForConfirmation: (config: {
    txId: string;
    timeout: number;
  }) => Promise<any>;
  prolong: () => void;
  reloadAccount: () => Promise<void>;
  checkNetwork: () => string | false;
  signAuthTx: (config: { account: string; realm: string }) => Promise<any>;

  // Aggregator specific data
  aggregatorData: Record<string, Ref<any>>;
  dexAggregators: DexAggregator[];
}

export interface DexAggregator {
  name: string;
  displayName: string;
  enabledKey: string;
  quotesKey: string;
  txnsKey: string;
  processingKey: string;
  getQuote: (context: SwapContext) => Promise<void>;
  execute: (context: SwapContext) => Promise<void>;
  allowExecute: (context: SwapContext) => boolean;
  isQuoteBetter: (context: SwapContext) => boolean;
  getFolksClient?: (context: SwapContext) => FolksRouterClient | null;
}
