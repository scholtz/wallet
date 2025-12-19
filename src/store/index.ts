import { createStore, Store, useStore as baseUseStore } from "vuex";
import type { AlgodState } from "./algod";
import type { Arc14State } from "./arc14";
import type { AxiosState } from "./axios";
import type { ConfigState } from "./config";
import type { Fa2State } from "./fa2";
import type { IndexerState } from "./indexer";
import type { ParticipationState } from "./participation";
import type { PublicDataState } from "./publicData";
import type { ToastState } from "./toast";
import type { VoteState } from "./vote";
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
  algod: AlgodState;
  axios: AxiosState;
  config: ConfigState;
  wallet: WalletState;
  indexer: IndexerState;
  toast: ToastState;
  vote: VoteState;
  publicData: PublicDataState;
  participation: ParticipationState;
  arc14: Arc14State;
  signer: Record<string, unknown>;
  wc: Record<string, unknown>;
  wcClient: Record<string, unknown>;
  fa2: Fa2State;
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
