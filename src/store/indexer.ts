import algosdk from "algosdk";
import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";
import type { ConfigState } from "./config";

export type ExtendedStoredAsset = StoredAsset & {
  amount?: bigint;
};

export interface StoredAsset {
  assetId: bigint;
  name?: string;
  unitName?: string;
  decimals?: number;
  label?: string;
  type: "Native" | "ASA" | "ARC200";
}

export type BalanceCache = Record<
  string,
  Record<string, Record<string, number>>
>;

export interface IndexerState {
  assets: StoredAsset[];
  balance: BalanceCache;
}

interface BalancePayload {
  account: string;
  round: number;
  assetId?: number;
  balance: number;
}

interface AccountInformationPayload {
  addr: string;
}

interface AccountWithAssetPayload {
  addr: string;
  asset: number;
}

interface NotePayload {
  note: string;
}

interface NoteAmountPayload extends NotePayload {
  amount: number;
  min?: number;
}

interface NoteAmountAccountPayload extends NoteAmountPayload {
  account: string;
}

interface TokenNoteAmountPayload extends NotePayload {
  amount: number;
  assetId: number;
}

interface TokenNoteAmountAccountPayload extends TokenNoteAmountPayload {
  account: string;
}

export interface AssetPayload {
  assetIndex: bigint;
}

interface BalanceAtRoundPayload {
  account: string;
  round: number;
  assetId?: number;
}

interface AssetsByNamePayload {
  name: string;
}

export interface AccountFallback {
  address: string;
  amount: number;
  "amount-without-pending-rewards": number;
  "apps-local-state": unknown[];
  "apps-total-schema": Record<string, unknown>;
  assets: unknown[];
  "created-apps": unknown[];
  "created-at-round": number;
  deleted: boolean;
  "pending-rewards": number;
  "reward-base": number;
  rewards: number;
  round: number;
  "sig-type": string;
  status: string;
  "total-apps-opted-in": number;
  "total-assets-opted-in": number;
  "total-box-bytes": number;
  "total-boxes": number;
  "total-created-apps": number;
  "total-created-assets": number;
}

const DEFAULT_ACCOUNT: AccountFallback = {
  address: "",
  amount: 0,
  "amount-without-pending-rewards": 0,
  "apps-local-state": [],
  "apps-total-schema": {},
  assets: [],
  "created-apps": [],
  "created-at-round": 0,
  deleted: false,
  "pending-rewards": 0,
  "reward-base": 0,
  rewards: 0,
  round: 0,
  "sig-type": "sig",
  status: "Offline",
  "total-apps-opted-in": 0,
  "total-assets-opted-in": 0,
  "total-box-bytes": 0,
  "total-boxes": 0,
  "total-created-apps": 0,
  "total-created-assets": 0,
};

type IndexerAccount = Record<string, unknown>;

const state = (): IndexerState => ({
  assets: [],
  balance: {},
});

const getIndexerClient = (config: ConfigState): algosdk.Indexer => {
  const url = new URL(config.indexer);
  return new algosdk.Indexer(config.indexerToken, config.indexer, url.port);
};

const mutations: MutationTree<IndexerState> = {
  setAsset(currentState, assetInfo: StoredAsset) {
    currentState.assets.push(assetInfo);
  },
  setBalance(
    currentState,
    { account, round, assetId, balance }: BalancePayload
  ) {
    const roundKey = String(round);
    if (!currentState.balance[roundKey]) {
      currentState.balance[roundKey] = {};
    }
    if (!currentState.balance[roundKey][account]) {
      currentState.balance[roundKey][account] = {};
    }
    const assetKey = String(assetId ?? 0);
    currentState.balance[roundKey][account][assetKey] = balance;
  },
};

const actions: ActionTree<IndexerState, RootState> = {
  async getIndexer({ rootState }) {
    return getIndexerClient(rootState.config);
  },
  async accountInformation(
    { rootState },
    { addr }: AccountInformationPayload
  ): Promise<IndexerAccount | AccountFallback> {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const ret = await indexerClient.lookupAccountByID(addr).do();
      if (!ret?.account) {
        return { ...DEFAULT_ACCOUNT, address: addr };
      }
      return (
        (ret.account as unknown as IndexerAccount) ?? {
          ...DEFAULT_ACCOUNT,
          address: addr,
        }
      );
    } catch (error) {
      const message = (error as Error)?.message ?? "";
      if (message.includes("no accounts found")) {
        console.warn(
          `accountInformation: missing account ${addr}, returning fallback`,
          error
        );
        return { ...DEFAULT_ACCOUNT, address: addr };
      }
      console.error("accountInformation", error);
      throw error;
    }
  },
  async searchForTransactions(
    { rootState },
    { addr, note }: AccountInformationPayload & Partial<NotePayload>
  ): Promise<algosdk.indexerModels.TransactionsResponse | undefined> {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const search = indexerClient.searchForTransactions().address(addr);
      if (note) {
        const enc = new TextEncoder();
        const noteenc = enc.encode(note);
        search.notePrefix(noteenc);
      }
      return await search.do();
    } catch (error) {
      console.error("searchForTransactions", error);
      return undefined;
    }
  },
  async searchForTransactionsWithAddrAndAsset(
    { rootState },
    { addr, asset }: AccountWithAssetPayload
  ) {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const search = indexerClient
        .searchForTransactions()
        .address(addr)
        .assetID(asset);
      return await search.do();
    } catch (error) {
      console.error("searchForTransactionsWithAddrAndAsset", error);
      return undefined;
    }
  },
  async searchForTransactionsWithNoteAndAmount(
    { rootState },
    { note, amount, min = 0 }: NoteAmountPayload
  ) {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const enc = new TextEncoder();
      const noteenc = enc.encode(note);
      const search = indexerClient
        .searchForTransactions()
        .currencyGreaterThan(amount - 1)
        .currencyLessThan(amount + 1)
        .minRound(Math.max(min, 0))
        .notePrefix(noteenc);
      return await search.do();
    } catch (error) {
      console.error("searchForTransactionsWithNoteAndAmount", error);
      return undefined;
    }
  },
  async searchForTokenTransactionsWithNoteAndAmount(
    { rootState },
    { note, amount, assetId }: TokenNoteAmountPayload
  ) {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const enc = new TextEncoder();
      const noteenc = enc.encode(note);
      const search = indexerClient
        .searchForTransactions()
        .assetID(assetId)
        .currencyGreaterThan(amount - 1)
        .currencyLessThan(amount + 1)
        .notePrefix(noteenc);
      return await search.do();
    } catch (error) {
      console.error("searchForTokenTransactionsWithNoteAndAmount", error);
      return undefined;
    }
  },
  async searchForTransactionsWithNoteAndAmountAndAccount(
    { rootState },
    { note, amount, account }: NoteAmountAccountPayload
  ) {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const enc = new TextEncoder();
      const noteenc = enc.encode(note);
      const search = indexerClient
        .searchForTransactions()
        .currencyGreaterThan(amount - 1)
        .currencyLessThan(amount + 1)
        .notePrefix(noteenc)
        .address(account);
      return await search.do();
    } catch (error) {
      console.error("searchForTransactionsWithNoteAndAmountAndAccount", error);
      return undefined;
    }
  },
  async searchForTokenTransactionsWithNoteAndAmountAndAccount(
    { rootState },
    { note, amount, account, assetId }: TokenNoteAmountAccountPayload
  ) {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const enc = new TextEncoder();
      const noteenc = enc.encode(note);
      const search = indexerClient
        .searchForTransactions()
        .currencyGreaterThan(amount - 1)
        .currencyLessThan(amount + 1)
        .notePrefix(noteenc)
        .address(account)
        .assetID(assetId);
      return await search.do();
    } catch (error) {
      console.error(
        "searchForTokenTransactionsWithNoteAndAmountAndAccount",
        error
      );
      return undefined;
    }
  },
  async getAsset(
    { commit, state, rootState },
    { assetIndex }: AssetPayload
  ): Promise<StoredAsset | undefined> {
    try {
      if (!assetIndex) {
        const native: StoredAsset = {
          assetId: -1n,
          name: "ALG",
          decimals: 6,
          unitName: "",
          label: "Algorand native token",
          type: "Native",
        };
        return native;
      }
      const env = rootState.config.env;
      const envPrefix =
        env === "mainnet" || env === "mainnet-v1.0" ? "" : `${env}-`;
      const cacheKey = `Asset-${envPrefix}${assetIndex}`;
      try {
        const cache = localStorage.getItem(cacheKey);
        if (cache) {
          const cacheObj = JSON.parse(cache) as StoredAsset;
          if (
            cacheObj &&
            cacheObj.assetId &&
            BigInt(cacheObj.assetId) === BigInt(assetIndex)
          ) {
            commit("setAsset", cacheObj);
            return cacheObj;
          }
        }
      } catch (error) {
        console.error("getAsset cache parse", error);
      }

      const indexerClient = getIndexerClient(rootState.config);
      const existing = state.assets.find(
        (a) => a.assetId && BigInt(a.assetId) === BigInt(assetIndex)
      );
      if (existing) {
        return existing;
      }
      const assetInfo = await indexerClient
        .searchForAssets()
        .index(assetIndex)
        .do();
      if (
        assetInfo?.assets &&
        assetInfo.assets.length > 0 &&
        assetInfo.assets[0].params
      ) {
        const assetParams = assetInfo.assets[0].params;
        const assetInfoData: StoredAsset = {
          label: assetParams.name,
          decimals: assetParams.decimals,
          name: assetParams.name,
          unitName: assetParams.unitName,
          assetId: BigInt(assetIndex),
          type: "ASA",
        };
        commit("setAsset", assetInfoData);
        const data = JSON.stringify(assetInfoData, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        );
        localStorage.setItem(cacheKey, data);
        return assetInfoData;
      }
    } catch (error) {
      console.error("getAsset", error);
    }
    return undefined;
  },
  async getAccountBalanceAtRound(
    { commit, state, rootState },
    { account, round, assetId }: BalanceAtRoundPayload
  ) {
    try {
      const roundKey = String(round);
      const assetKey = String(assetId ?? 0);
      const cached = state.balance[roundKey]?.[account]?.[assetKey];
      if (cached !== undefined) {
        return cached;
      }
      const indexerClient = getIndexerClient(rootState.config);
      const accountInfo = await indexerClient
        .lookupAccountByID(account)
        .round(round)
        .do();

      if (!accountInfo?.account) {
        return undefined;
      }

      let balance = 0;
      if (!assetId || assetId <= 0) {
        const amountValue = accountInfo.account.amount as number | bigint;
        balance =
          typeof amountValue === "bigint"
            ? Number(amountValue) / 1_000_000
            : amountValue / 1_000_000;
      } else {
        const accountAssets = accountInfo.account.assets as
          | Array<Record<string, any>>
          | undefined;
        const item = accountAssets?.find(
          (a) =>
            a["assetId"] === assetId &&
            a["deleted"] === false &&
            a["is-frozen"] === false
        );
        if (item) {
          const holdingAmount = item.amount as number | bigint;
          balance =
            typeof holdingAmount === "bigint"
              ? Number(holdingAmount)
              : holdingAmount;
        }
      }

      if (balance > 0) {
        commit("setBalance", { account, round, assetId, balance });
        return balance;
      }
    } catch (error) {
      console.error("getAccountBalanceAtRound", error);
    }
    return undefined;
  },
  async getAssetsByName({ rootState }, { name }: AssetsByNamePayload) {
    try {
      const indexerClient = getIndexerClient(rootState.config);
      const assetInfo = await indexerClient.searchForAssets().name(name).do();
      return assetInfo.assets as unknown as StoredAsset[];
    } catch (error) {
      console.error("getAssetsByName", error);
      return [];
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
