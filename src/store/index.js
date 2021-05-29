import { createStore } from "vuex";
import algod from "./algod";
import axios from "./axios";
import config from "./config";
import wallet from "./wallet";
import indexer from "./indexer";

const debugStrict = process.env.NODE_ENV !== "production";

export default createStore({
  modules: {
    algod,
    axios,
    config,
    wallet,
    indexer,
  },
  strict: debugStrict,
});
