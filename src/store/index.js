import { createStore } from "vuex";
import axios from "./axios";
import config from "./config";
import wallet from "./wallet";

const debugStrict = process.env.NODE_ENV !== "production";

export default createStore({
  modules: {
    axios,
    config,
    wallet,
  },
  strict: debugStrict,
});
