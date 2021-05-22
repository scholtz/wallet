import { createStore } from "vuex";
import axios from "./axios";
import config from "./config";

const debugStrict = process.env.NODE_ENV !== "production";

export default createStore({
  modules: {
    axios,
    config,
  },
  strict: debugStrict,
});
