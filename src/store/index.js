import { createStore } from "vuex";
import algod from "./algod";
import axios from "./axios";
import config from "./config";
import wallet from "./wallet";
import indexer from "./indexer";
import toast from "./toast";
import vote from "./vote";
import publicData from "./publicData";
import kmd from "./kmd";
import arc14 from "./arc14";
import signer from "./signer";
import wc from "./wc";

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
    kmd,
    arc14,
    signer,
    wc,
  },
  strict: debugStrict,
});
