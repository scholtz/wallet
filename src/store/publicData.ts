import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";

export interface GenesisNetwork {
  network: string;
  CAIP10: string;
  [key: string]: unknown;
}

export type ProviderEntry = Record<string, unknown>;

export interface PublicDataState {
  genesisList: GenesisNetwork[];
  algodList: Record<string, ProviderEntry[]>;
  participationList: Record<string, ProviderEntry[]>;
  indexerList: Record<string, ProviderEntry[]>;
  twoFactorAuthList: Record<string, ProviderEntry[]>;
}

interface ChainDataPayload {
  chainId: string;
  data?: ProviderEntry[];
}

const state = (): PublicDataState => ({
  genesisList: [],
  algodList: {},
  participationList: {},
  indexerList: {},
  twoFactorAuthList: {},
});

const mutations: MutationTree<PublicDataState> = {
  setGenesisList(currentState, data: GenesisNetwork[]) {
    if (data) {
      currentState.genesisList = data;
    }
  },
  setAlgodList(currentState, { chainId, data }: ChainDataPayload) {
    if (data) {
      currentState.algodList[chainId] = data;
    }
  },
  setParticipationList(currentState, { chainId, data }: ChainDataPayload) {
    if (data) {
      currentState.participationList[chainId] = data;
    }
  },
  setIndexerList(currentState, { chainId, data }: ChainDataPayload) {
    if (data) {
      currentState.indexerList[chainId] = data;
    }
  },
  setTwoFactorAuthList(currentState, { chainId, data }: ChainDataPayload) {
    if (data) {
      currentState.twoFactorAuthList[chainId] = data;
    }
  },
};

interface ChainIdPayload {
  chainId: string;
}

const actions: ActionTree<PublicDataState, RootState> = {
  async getCurrentChainId({ dispatch, state, rootState }) {
    await dispatch("getGenesisList");
    const network = state.genesisList.find(
      (n) => n.network === rootState.config.env
    );
    return network?.CAIP10 ?? "SandBox";
  },
  async getGenesisList({ state, dispatch, commit }) {
    try {
      if (state.genesisList.length === 0) {
        const data = (await dispatch(
          "axios/get",
          {
            url: "https://scholtz.github.io/AlgorandPublicData/genesis/genesis-list.json",
          },
          { root: true }
        )) as GenesisNetwork[] | undefined;
        if (data) {
          commit("setGenesisList", data);
        }
      }
      return state.genesisList;
    } catch (error) {
      console.error("getGenesisList", error);
      return state.genesisList;
    }
  },
  async getAlgodList({ state, dispatch, commit }, { chainId }: ChainIdPayload) {
    try {
      const cached = state.algodList[chainId];
      if (cached?.length) {
        return cached;
      }
      const data = (await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/algod/${chainId}/public-algod-providers.json`,
        },
        { root: true }
      )) as ProviderEntry[] | undefined;
      if (data) {
        commit("setAlgodList", { chainId, data });
        return data;
      }
      return [];
    } catch (error) {
      console.error("getAlgodList", error);
      return state.algodList[chainId] ?? [];
    }
  },
  async getParticipationList(
    { state, dispatch, commit },
    { chainId }: ChainIdPayload
  ) {
    try {
      const cached = state.participationList[chainId];
      if (cached?.length) {
        return cached;
      }
      const data = (await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/participation/${chainId}/public-participation-providers.json`,
        },
        { root: true }
      )) as ProviderEntry[] | undefined;
      if (data) {
        commit("setParticipationList", { chainId, data });
        return data;
      }
      return [];
    } catch (error) {
      console.error("getParticipationList", error);
      return state.participationList[chainId] ?? [];
    }
  },
  async getIndexerList(
    { state, dispatch, commit },
    { chainId }: ChainIdPayload
  ) {
    try {
      const cached = state.indexerList[chainId];
      if (cached?.length) {
        return cached;
      }
      const data = (await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/indexer/${chainId}/public-indexer-providers.json`,
        },
        { root: true }
      )) as ProviderEntry[] | undefined;
      if (data) {
        commit("setIndexerList", { chainId, data });
        return data;
      }
      return [];
    } catch (error) {
      console.error("getIndexerList", error);
      return state.indexerList[chainId] ?? [];
    }
  },
  async getTwoFactorAuthList(
    { state, dispatch, commit },
    { chainId }: ChainIdPayload
  ) {
    try {
      const cached = state.twoFactorAuthList[chainId];
      if (cached?.length) {
        return cached;
      }
      const data = (await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/2fa/${chainId}/public-2fa-providers.json`,
        },
        { root: true }
      )) as ProviderEntry[] | undefined;
      if (data) {
        commit("setTwoFactorAuthList", { chainId, data });
        return data;
      }
      return [];
    } catch (error) {
      console.error("getTwoFactorAuthList", error);
      return state.twoFactorAuthList[chainId] ?? [];
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
