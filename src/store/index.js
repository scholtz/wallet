import { createStore } from "vuex";
import algod from "./algod";
import axios from "./axios";
import config from "./config";
import wallet from "./wallet";

const debugStrict = process.env.NODE_ENV !== "production";

export default createStore({
  modules: {
    algod,
    axios,
    config,
    wallet,
  },
  strict: debugStrict,
});
