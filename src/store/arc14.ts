import type { ActionTree, MutationTree } from "vuex";
import { Buffer } from "buffer";
import algosdk from "algosdk";
import type { RootState } from "./index";

export interface Arc14State {
  address2chain2realm2token: Record<
    string,
    Record<string, Record<string, string>>
  >;
}

interface Arc14AuthPayload {
  chain: string;
  addr: string;
  realm: string;
  token: string;
}

interface AuthTxPayload {
  account: string;
  realm: string;
}

interface Arc14Config {
  algod: string;
  algodToken: string;
  env: string;
}

const state = (): Arc14State => ({
  address2chain2realm2token: {},
});

const ensureChainEntry = (
  state: Arc14State,
  chain: string
): Record<string, Record<string, string>> => {
  if (!state.address2chain2realm2token[chain]) {
    state.address2chain2realm2token[chain] = {};
  }
  return state.address2chain2realm2token[chain];
};

const ensureAddressEntry = (
  chainMap: Record<string, Record<string, string>>,
  addr: string
): Record<string, string> => {
  if (!chainMap[addr]) {
    chainMap[addr] = {};
  }
  return chainMap[addr];
};

const getConfig = (rootState: RootState): Arc14Config => {
  const config = rootState.config as Partial<Arc14Config>;
  if (!config?.algod || !config?.algodToken || !config?.env) {
    throw new Error("Algod configuration missing");
  }
  return config as Arc14Config;
};

const getAlgodClient = (rootState: RootState): algosdk.Algodv2 => {
  const config = getConfig(rootState);
  const url = new URL(config.algod);
  return new algosdk.Algodv2(config.algodToken, config.algod, url.port);
};

const mutations: MutationTree<Arc14State> = {
  storeArc14Auth(state, { chain, addr, realm, token }: Arc14AuthPayload) {
    const chainMap = ensureChainEntry(state, chain);
    const addressMap = ensureAddressEntry(chainMap, addr);
    addressMap[realm] = token;
  },
};

const actions: ActionTree<Arc14State, RootState> = {
  async storeArc14Auth({ commit }, payload: Arc14AuthPayload) {
    await commit("storeArc14Auth", payload);
  },
  async getAuthTx({ dispatch, rootState }, { account, realm }: AuthTxPayload) {
    try {
      if (!account) throw new Error("Address not found.");
      const algodClient = getAlgodClient(rootState);
      const suggestedParams = await algodClient.getTransactionParams().do();
      suggestedParams.fee = 0n;
      suggestedParams.flatFee = true;
      const note = Buffer.from(realm, "utf-8");
      return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: account,
        receiver: account,
        amount: 0,
        note: new Uint8Array(note),
        suggestedParams,
      });
    } catch (error) {
      console.error("Failed to build auth transaction", error);
      const message =
        (error as { response?: string; message?: string })?.response ||
        (error as Error).message;
      await dispatch("toast/openError", message, { root: true });
      return undefined;
    }
  },
  async signAuthTx(
    { dispatch, commit, rootState },
    { account, realm }: AuthTxPayload
  ) {
    try {
      if (!account) throw new Error("Address not found.");
      const authTxn = await dispatch("getAuthTx", { account, realm });
      if (!authTxn) {
        throw new Error("Unable to prepare authentication transaction");
      }
      const signedAuthTxn = (await dispatch(
        "signer/signTransaction",
        { from: account, tx: authTxn },
        { root: true }
      )) as Uint8Array;
      if (!signedAuthTxn) {
        throw new Error("Error signing the transaction");
      }
      const b64 = Buffer.from(signedAuthTxn).toString("base64");
      const auth = `SigTx ${b64}`;
      const config = getConfig(rootState);
      commit("storeArc14Auth", {
        chain: config.env,
        addr: account,
        realm,
        token: auth,
      });
      return auth;
    } catch (error) {
      console.error("Failed to sign auth transaction", error);
      const message =
        (error as { response?: string; message?: string })?.response ||
        (error as Error).message;
      await dispatch("toast/openError", message, { root: true });
      return undefined;
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
