import { createStore, Store, useStore as baseUseStore } from "vuex";
import type { WalletState } from "./wallet";
import algod from "./algod";
import axios from "./axios";
import config from "./config";
import wallet from "./wallet";
import indexer from "./indexer";
import toast from "./toast";
import vote from "./vote";
import publicData from "./publicData";
import participation from "./participation";
import arc14 from "./arc14";
import signer from "./signer";
import wc from "./wc";
import wcClient from "./wcClient";
import fa2 from "./fa2";

export interface RootState {
  algod: Record<string, unknown>;
  axios: Record<string, unknown>;
  config: Record<string, unknown>;
  wallet: WalletState;
  indexer: Record<string, unknown>;
  toast: Record<string, unknown>;
  vote: Record<string, unknown>;
  publicData: Record<string, unknown>;
  participation: Record<string, unknown>;
  arc14: Record<string, unknown>;
  signer: Record<string, unknown>;
  wc: Record<string, unknown>;
  wcClient: Record<string, unknown>;
  fa2: Record<string, unknown>;
}

const debugStrict = process.env.NODE_ENV !== "production";

export const store = createStore<RootState>({
  modules: {
    algod,
    axios,
    config,
    wallet,
    indexer,
    toast,
    vote,
    publicData,
    participation,
    arc14,
    signer,
    wc,
    wcClient,
    fa2,
  },
  strict: debugStrict,
});

export function useStore() {
  return baseUseStore<RootState>();
}

export default store;
