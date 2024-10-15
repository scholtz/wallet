import algosdk from "algosdk";
const state = () => ({
  address2chain2realm2token: {},
});

const mutations = {
  storeArc14Auth(state, { chain, addr, realm, token }) {
    if (state.address2chain2realm2token[chain] === undefined) {
      state.address2chain2realm2token[chain] = {};
    }
    if (state.address2chain2realm2token[chain][addr] === undefined) {
      state.address2chain2realm2token[chain][addr] = {};
    }
    state.address2chain2realm2token[chain][addr][realm] = token;
  },
};
const actions = {
  async storeArc14Auth({ commit }, { chain, addr, realm, token }) {
    await commit("storeArc14Auth", {
      chain,
      addr,
      realm,
      token,
    });
  },
  async getAuthTx({ dispatch, commit }, { account, realm }) {
    try {
      if (!account) throw new Error("Address not found.");
      const url = new URL(this.state.config.algod);
      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );

      const suggestedParams = await algodclient.getTransactionParams().do();

      const authParams = suggestedParams;
      authParams.fee = 0;
      const note = Buffer.from(realm, "utf-8");
      const authObj = {
        from: account,
        to: account,
        amount: 0,
        note: new Uint8Array(note),
        suggestedParams: authParams,
      };
      const authTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject(authObj);
      return authTxn;
    } catch (error) {
      console.error("error", error, dispatch);
      const msg = error.response ? error.response : error.message;
      dispatch("toast/openError", msg, {
        root: true,
      });
    }
  },
  async signAuthTx({ dispatch, commit }, { account, realm }) {
    try {
      if (!account) throw new Error("Address not found.");
      const authTxn = await dispatch("getAuthTx", { account, realm });

      let signedAuthTxn = await dispatch(
        "signer/signTransaction",
        { from: account, tx: authTxn },
        {
          root: true,
        }
      );
      if (!signedAuthTxn) {
        throw new Error("Error signing the transaction");
      }
      const b64 = Buffer.from(signedAuthTxn).toString("base64");
      const auth = "SigTx " + b64;
      commit("storeArc14Auth", {
        chain: this.state.config.env,
        addr: account,
        realm,
        token: auth,
      });
      return auth;
    } catch (error) {
      console.error("error", error, dispatch);
      const msg = error.response ? error.response : error.message;
      dispatch("toast/openError", msg, {
        root: true,
      });
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
