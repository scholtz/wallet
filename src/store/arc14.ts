import type { ActionTree, MutationTree } from "vuex";
import { Buffer } from "buffer";
import algosdk from "algosdk";
import type { RootState } from "./index";
import { findGenesisMismatch } from "@/scripts/dappRequestChecks";
import {
  arc14TokenFromSigned,
  isArc14AuthTransaction,
  isArc14TokenUsable,
  parseArc14Token,
} from "@/scripts/encoding/arc14";

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

const mutations: MutationTree<Arc14State> = {
  reset(state) {
    state.address2chain2realm2token = {};
  },
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
  /**
   * The stored login of `account` for `realm` on the selected network when it is complete and
   * still valid for a while, else undefined. This is how accounts that cannot sign in place
   * (multisig, Ledger) are authenticated: the login is signed once on the Sign-all page and
   * reused here until it nears its expiry.
   */
  async getUsableAuth(
    { dispatch, state, rootState },
    { account, realm }: AuthTxPayload,
  ): Promise<string | undefined> {
    const token =
      state.address2chain2realm2token[rootState.config.env]?.[account]?.[realm];
    if (!token) return undefined;
    try {
      const params: algosdk.SuggestedParams = await dispatch(
        "algod/getCheckedTransactionParams",
        undefined,
        { root: true },
      );
      return isArc14TokenUsable(token, account, realm, BigInt(params.firstValid))
        ? token
        : undefined;
    } catch (error) {
      // Not knowing the round only means the login cannot be vouched for: ask for a new one.
      console.error("Could not check the stored ARC-14 login", error);
      return undefined;
    }
  },
  /**
   * Keeps a login signed elsewhere (the Sign-all page) for reuse. Only a complete login of the
   * selected network is accepted; the account, realm and token all come from the transaction.
   */
  async storeSignedAuth(
    { commit, rootState },
    { signed }: { signed: Uint8Array },
  ): Promise<boolean> {
    const token = arc14TokenFromSigned(signed);
    const decoded = parseArc14Token(token);
    if (!decoded || !isArc14AuthTransaction(decoded.txn)) return false;
    const addr = decoded.txn.sender.toString();
    const realm = Buffer.from(decoded.txn.note ?? []).toString("utf-8");
    // A login made for another network must never be kept under the selected one.
    if (findGenesisMismatch([decoded.txn], rootState.config.env) !== undefined) {
      return false;
    }
    const round = BigInt(decoded.txn.firstValid);
    if (!isArc14TokenUsable(token, addr, realm, round)) return false;
    commit("storeArc14Auth", {
      chain: rootState.config.env,
      addr,
      realm,
      token,
    });
    return true;
  },
  async getAuthTx({ dispatch, rootState }, { account, realm }: AuthTxPayload) {
    try {
      if (!account) throw new Error("Address not found.");
      const suggestedParams: algosdk.SuggestedParams = await dispatch(
        "algod/getCheckedTransactionParams",
        undefined,
        { root: true }
      );
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
