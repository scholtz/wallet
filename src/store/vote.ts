import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";

export interface VoteToken {
  name: string;
  assetId: string;
  env: string;
}

export interface VoteState {
  assetId: string;
  voteTokens: VoteToken[];
}

const defaultTokens: VoteToken[] = [
  { name: "Algo", assetId: "-1", env: "mainnet-v1.0" },
  { name: "Vote Coin", assetId: "452399768", env: "mainnet-v1.0" },
  { name: "ASA Stats", assetId: "393537671", env: "mainnet-v1.0" },
  { name: "Algo", assetId: "-1", env: "testnet-v1.0" },
  { name: "Vote Coin", assetId: "48806985", env: "testnet-v1.0" },
  { name: "ASA Stats", assetId: "51768942", env: "testnet-v1.0" },
  { name: "Algo", assetId: "-1", env: "sandnet-v1" },
  { name: "Vote Coin", assetId: "12", env: "sandnet-v1" },
];

const state = (): VoteState => ({
  assetId: "",
  voteTokens: [...defaultTokens],
});

const mutations: MutationTree<VoteState> = {
  setTokens(currentState, voteTokens: VoteToken[]) {
    if (Array.isArray(voteTokens)) {
      currentState.voteTokens = voteTokens;
    }
  },
  setToken(currentState, assetId: string) {
    if (assetId) {
      currentState.assetId = assetId;
      localStorage.setItem("voteToken", assetId);
    }
  },
};

const actions: ActionTree<VoteState, RootState> = {
  async setToken({ commit }, { assetId }: { assetId: string }) {
    commit("setToken", assetId);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
