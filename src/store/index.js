import { createStore } from "vuex";
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

const debugStrict = process.env.NODE_ENV !== "production";

export default createStore({
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
