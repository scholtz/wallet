import { Ref } from "vue";
import { SwapStore, SwapRoute, Account } from "../../types/swap";
import {
  FolksRouterClient,
  SwapQuote as FolksSwapQuote,
  SwapTransactions as FolksSwapTransactions,
} from "@folks-router/js-sdk";
// biatecRouter is a namespace object (both value and type namespace) - the
// generated client's response types (QuoteRoute, ...) are only reachable as
// members of it (biatecRouter.QuoteRoute), not as top-level named exports.
import type { biatecRouter } from "biatec-router";
import { StoredAsset } from "@/store/indexer";
import algosdk from "algosdk";

// ---------------------------------------------------------------------------
// Deflex aggregator response shapes. Deflex (deflex.txnlab.dev) is a plain
// JSON HTTP API with no published TypeScript SDK/types - these interfaces
// are hand-derived from the fields this codebase actually reads off its
// responses (see deflex.ts, routeInfo.ts, simulate.ts).
// ---------------------------------------------------------------------------

export interface DeflexRouteHopStep {
  name?: string;
  in?: { id?: number };
  out?: { id?: number };
}

export interface DeflexRoute {
  percentage?: number;
  path?: DeflexRouteHopStep[];
}

export interface DeflexQuoteData {
  txnPayload: string;
  quote?: number;
  route?: DeflexRoute[];
  userPriceImpact?: number;
  requiredAppOptIns?: number[];
}

export interface DeflexGroupMetadata {
  labelText?: string;
}

export interface DeflexTxnEntry {
  group: string;
  // `false` for a plain unsigned transaction to be signed with the wallet's
  // own key (decoded from `data`); otherwise a byte-indexed object -
  // `Object.values(...)` reassembles it into the raw signed-logicsig bytes.
  logicSigBlob: false | Record<number, number>;
  data: string;
}

export interface DeflexTxsData {
  groupMetadata: DeflexGroupMetadata[];
  txns: DeflexTxnEntry[];
}

// ---------------------------------------------------------------------------
// Folks Router aggregator response shapes - re-exported under
// aggregator-neutral names from @folks-router/js-sdk's own published types.
// ---------------------------------------------------------------------------

export type FolksQuoteData = FolksSwapQuote;
export type FolksTxnsData = FolksSwapTransactions;

// ---------------------------------------------------------------------------
// Biatec Router aggregator response shapes. biatec-router is a generated
// OpenAPI client (biatecRouter.RouterService) - QuoteRoute/HopExecution/
// PoolExecution come straight from its own .d.ts (generated-client types,
// consumed as-is per CLAUDE.md's Type safety section).
// ---------------------------------------------------------------------------

export interface BiatecCombinedRoute {
  // Hops merged across every leg of a split route - see combineRouteResponse
  // in biatec.ts.
  route: biatecRouter.QuoteRoute;
  txsToSign: string[];
}

export interface BiatecQuoteData {
  route?: BiatecCombinedRoute;
  quoteAmount?: number;
  fees?: number;
}

// ---------------------------------------------------------------------------
// Shared aggregatorData store. SwapContext.aggregatorData is a dynamically-
// keyed dictionary (keyed by each DexAggregator's own quotesKey/txnsKey/
// processingKey/enabledKey string), so its value type has to be the union of
// every shape any of those keys can hold. Individual aggregator modules know
// (by construction - they own the key names) which concrete member applies
// at each read site and narrow with `as` there.
// ---------------------------------------------------------------------------

export interface SimulationAugmentation {
  // Attached post-hoc by useSwap.ts's simulateAggregatorQuote() once an algod
  // simulate call resolves/fails - not part of any aggregator's own API
  // response shape.
  simulatedQuoteAmount?: number;
  simulationFailed?: boolean;
}

export type DeflexQuoteState = Partial<DeflexQuoteData> & SimulationAugmentation;
export type FolksQuoteState = Partial<FolksQuoteData> & SimulationAugmentation;
export type BiatecQuoteState = Partial<BiatecQuoteData> & SimulationAugmentation;

export type AggregatorQuoteData =
  | DeflexQuoteState
  | FolksQuoteState
  | BiatecQuoteState;

export type AggregatorDataValue =
  | boolean
  | AggregatorQuoteData
  | Partial<DeflexTxsData>
  | FolksTxnsData
  | string[]; // biatecTxns/biatecStageTxns - unused legacy slot, always []

// The concrete, known set of keys every dexAggregators.ts entry currently
// uses (see biatec.ts/deflex.ts/folks.ts's enabledKey/quotesKey/txnsKey/
// processingKey), typed precisely so static `aggregatorData.useFolks.value`-
// style access (as done in pages/Swap.vue) gets its real boolean/quote/txns
// type instead of the wide AggregatorDataValue union. Keyed access via a
// runtime string (`aggregatorData[someKey]`, used throughout this
// aggregator cluster since the active key isn't known until the matching
// DexAggregator is picked at runtime) still falls back to the index
// signature below.
export interface AggregatorDataMap {
  useDeflex: Ref<boolean>;
  useFolks: Ref<boolean>;
  useBiatec: Ref<boolean>;
  useBiatecStage: Ref<boolean>;
  processingTradeDeflex: Ref<boolean>;
  processingTradeFolks: Ref<boolean>;
  processingTradeBiatec: Ref<boolean>;
  processingTradeBiatecStage: Ref<boolean>;
  deflexQuotes: Ref<DeflexQuoteState>;
  deflexTxs: Ref<Partial<DeflexTxsData>>;
  folksQuote: Ref<FolksQuoteState>;
  folksTxns: Ref<FolksTxnsData>;
  biatecQuotes: Ref<BiatecQuoteState>;
  biatecTxns: Ref<string[]>;
  biatecStageQuotes: Ref<BiatecQuoteState>;
  biatecStageTxns: Ref<string[]>;
  [key: string]: Ref<AggregatorDataValue>;
}

export interface SwapContext {
  // State (Refs)
  assets: Ref<StoredAsset[]>;
  asset: Ref<bigint | null>;
  toAsset: Ref<bigint | null>;
  payamount: Ref<number>;
  fromAssetObj: Ref<StoredAsset | undefined>;
  toAssetObj: Ref<StoredAsset | undefined>;
  txsDetails: Ref<string>;
  hasSK: Ref<boolean | null>;
  processingQuote: Ref<boolean>;
  processingOptin: Ref<boolean>;
  note: Ref<string>;
  error: Ref<string>;
  slippage: Ref<number>;
  slippageProtectionEnabled: Ref<boolean>;
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
  // Deflex's fetchQuote/fetchExecuteSwapTxns HTTP endpoints are the only
  // callers of axiosGet/axiosPost in this codebase (see deflex.ts) - typed
  // to their actual response shapes rather than a generic passthrough.
  axiosGet: (config: { url: string }) => Promise<DeflexQuoteData>;
  axiosPost: (config: {
    url: string;
    body?: string;
    config?: { headers: Record<string, string> };
  }) => Promise<DeflexTxsData>;
  getSK: (config: { addr: string }) => Promise<Uint8Array>;
  getAsset: (config: { assetIndex: number | bigint }) => Promise<StoredAsset>;
  sendRawTransaction: (config: {
    signedTxn: Uint8Array | Uint8Array[];
  }) => Promise<algosdk.modelsv2.PostTransactionsResponse>;
  waitForConfirmation: (config: {
    txId: string;
    timeout: number;
  }) => Promise<algosdk.modelsv2.PendingTransactionResponse | undefined>;
  prolong: () => void;
  reloadAccount: () => Promise<void>;
  checkNetwork: () => string | false;
  signAuthTx: (config: { account: string; realm: string }) => Promise<string>;

  // Aggregator specific data
  aggregatorData: AggregatorDataMap;
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
