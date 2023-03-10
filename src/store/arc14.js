import algosdk from "algosdk";

const actions = {
  async signAuthTx({ dispatch, commit }, { account, realm }) {
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
      const sk = await dispatch(
        "wallet/getSK",
        { addr: account },
        {
          root: true,
        }
      );
      if (!sk) {
        throw new Error("You can sign txs only if you have private key to it");
      }
      let signedAuthTxn = authTxn.signTxn(sk);
      const b64 = Buffer.from(signedAuthTxn).toString("base64");
      const auth = "SigTx " + b64;
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
  actions,
};
