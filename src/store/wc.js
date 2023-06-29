import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { parseUri } from "@walletconnect/utils";
import wc from "../shared/wc";
import WCKeyValueStore from "../shared/WCKeyValueStore";

import algosdk from "algosdk";

const state = () => ({
  connectors: [],
  requests: [],
  web3wallet: null,
  sessionProposals: [],
  sessionRequests: [],
  authRequests: [],
  callRequests: [],
  subscriptions: [],
  algoSignTxns: [],
});

const mutations = {
  clear(state) {
    state.connectors.length = 0;
    state.requests.length = 0;
  },
  addConnector(state, connector) {
    state.connectors.push(connector);
  },
  removeConnector(state, id) {
    const index = state.connectors.findIndex((r) => r.id == id);
    state.connectors.splice(index, 1);
  },
  updateConnector(state, { id, update }) {
    const connector = state.connectors.find((r) => r.id == id);
    Object.assign(connector, update);
  },
  addRequest(state, { request }) {
    state.requests.push(request);
  },
  removeRequest(state, id) {
    const index = state.requests.findIndex((r) => r.id == id);
    state.requests.splice(index, 1);
  },
  setWeb3wallet(state, web3wallet) {
    state.web3wallet = web3wallet;
  },
  addSessionProposal(state, sessionProposal) {
    state.sessionProposals.push(sessionProposal);
  },
  removeSessionProposal(state, id) {
    const index = state.sessionProposals.findIndex((r) => r.id == id);
    state.sessionProposals.splice(index, 1);
  },
  addSessionRequest(state, sessionRequest) {
    state.sessionRequests.push(sessionRequest);
  },
  addAuthRequest(state, authRequest) {
    state.authRequests.push(authRequest);
  },
  addCallRequest(state, callRequest) {
    state.callRequests.push(callRequest);
  },
  addSubscription(state, subscription) {
    state.subscriptions.push(subscription);
  },
  addAlgoSignTxn(state, algoSignTxn) {
    state.algoSignTxns.push(algoSignTxn);
  },
};
const actions = {
  async init({ commit, dispatch }) {
    const walletConnectProjectId = this.state.config.walletConnectProjectId;
    const walletConnectMetadata = this.state.config.walletConnectMetadata;
    if (!walletConnectProjectId || !walletConnectMetadata)
      throw Error("WalletConnect ProjectId Not initialized");

    const store = new WCKeyValueStore(dispatch);

    const core = new Core({
      projectId: walletConnectProjectId,
      storage: store,
    });

    const web3wallet = await Web3Wallet.init({
      core,
      metadata: walletConnectMetadata,
    });

    await commit("setWeb3wallet", web3wallet);

    web3wallet.on("session_proposal", async (sessionProposal) => {
      console.log("on session_proposal", sessionProposal);
      await commit("addSessionProposal", sessionProposal);
    });
    web3wallet.on("session_request", async (sessionRequest) => {
      console.log("on session_request", sessionRequest);
      await commit("addSessionRequest", sessionRequest);

      if (
        sessionRequest &&
        sessionRequest.params &&
        sessionRequest.params.request
      ) {
        const request = sessionRequest.params.request;
        if (request.method === "algo_signTxn") {
          console.log("request", request);
          const transactions = request.params[0].map((item, index) => {
            const txn = item["txn"];
            console.log("txn", txn);
            const txnBuffer = Buffer.from(txn, "base64");
            console.log("txnBuffer", txnBuffer);
            const decodedObj = algosdk.decodeObj(txnBuffer);
            let decodedTx = decodedObj;
            console.log("decodedTx", decodedTx);
            if (!decodedTx.type && decodedTx.txn.type) {
              if (decodedTx.sig) {
                state.store.dispatch("signer/setSigned", {
                  signed: new Uint8Array(txnBuffer),
                });
              }
              decodedTx = decodedTx.txn;
            }
            const decoded = algosdk.decodeUnsignedTransaction(
              algosdk.encodeObj(decodedTx)
            );
            console.log("decoded", decoded);
            let asset = "";
            switch (decoded.type) {
              case "pay":
                asset = "ALGO";
                break;
              case "axfer":
                asset = decoded.assetIndex;
                break;
            }

            let amount = decoded.amount;

            switch (decoded.type) {
              case "pay":
              case "axfer":
                if (!amount) {
                  amount = "0";
                }
                break;
            }

            let from = decoded.from;
            if (from) {
              from = algosdk.encodeAddress(decoded.from.publicKey);
            }

            let rekeyto = decoded.rekeyTo;
            if (rekeyto) {
              rekeyto = algosdk.encodeAddress(rekeyto.publicKey);
            }

            return {
              index: index,
              type: decoded.type,
              from: from,
              fee: decoded.fee,
              asset: asset,
              amount: amount,
              rekeyTo: rekeyto,
              txn: decoded,
              txnB64: txn,
            };
          });

          let totalFee = 0;

          for (const tx of transactions) {
            if (tx.fee) {
              totalFee += tx.fee;
            }
          }

          const requestToStore = {
            id: sessionRequest.id,
            method: request.method,
            transactions: transactions,
            fee: totalFee,
            ver: "2",
            topic: sessionRequest.topic,
          };

          await commit("addRequest", { request: requestToStore });
        } else {
          console.error("request.method not implemented", request.method);
          // TODO
          // const response = {
          //   id: sessionRequest.id,
          //   error: {
          //     code: 4300,
          //     message: "Unsupported request.",
          //   },
          // };
          // web3wallet.rejectRequest(response);
        }
      }
    });
    web3wallet.on("auth_request", async (authRequest) => {
      console.log("on auth_request", authRequest);
      await commit("addAuthRequest", authRequest);
    });
    web3wallet.on("call_request", async (callRequest) => {
      console.log("on call_request", callRequest);
      await commit("addCallRequest", callRequest);
    });
    web3wallet.on("subscription_created", async (subscription) => {
      console.log("on subscription_created", subscription);
      await commit("addSubscription", subscription);
    });
    web3wallet.on("algo_signTxn", async (algoSignTxn) => {
      console.log("on algo_signTxn", algoSignTxn);
      await commit("addAlgoSignTxn", algoSignTxn);
    });
  },
  async approveSession({ commit, dispatch }, { id }) {
    console.log("wc.approveSession", id);
    const currentChain = await dispatch("publicData/getCurrentChainId", null, {
      root: true,
    });
    console.log("currentChain", currentChain);
    const lastActive = this.state.wallet.lastActiveAccount;
    const session = await this.state.wc.web3wallet.approveSession({
      id,
      namespaces: {
        algorand: {
          accounts: [`algorand:${currentChain}:${lastActive}`],
          methods: ["algo_signTxn"],
          chains: [`algorand:${currentChain}`],
          events: ["chainChanged", "accountsChanged"],
        },
        //skipPairing: true, // optional to skip pairing ( later it can be resumed by invoking .pair())
      },
    });
    console.log("approveSession", session);
    commit("removeSessionProposal", id);
  },
  async rejectSession({ commit, dispatch }, { id }) {
    console.log("wc.rejectSession", id);
    const session = await this.state.wc.web3wallet.rejectSession({
      id,
      reason: {
        message: "User rejected methods.",
        code: 5002,
      },
    });
    console.log("rejectSession", session);
    commit("removeSessionProposal", id);
  },
  async connectUri({ commit }, { uri }) {
    console.log("connectUri", uri);
    const { version } = parseUri(uri);
    const last = this.state.wallet.lastActiveAccount;
    if (version === 1) {
      console.log("wc connect v1 ", uri, last);
      wc.createConnector(uri, last);
    } else {
      console.log("wc connect v2 ", uri);
      try {
        await this.state.wc.web3wallet.pair({ uri, activatePairing: true });
      } catch (err) {
        console.error("unable to pair", err);
      }
      console.log("after pair", this.state.wc.web3wallet);
    }
  },
  async sendResult({ commit }, { data }) {
    try {
      console.log("sendResult", data);

      if (data.ver != 2) {
        // use WC 1
        return await wc.acceptRequest(data.id);
      }

      //data.id, data.transactions
      //const session = await this.state.wc.web3wallet.approveSession({
      const signedTxns = [];
      for (const item of data.transactions) {
        console.log("item", item);
        const txnBuffer = Buffer.from(item.txnB64, "base64");
        console.log("txnBuffer", txnBuffer);
        const decodedTx = algosdk.decodeUnsignedTransaction(txnBuffer);
        console.log("decodedTx", decodedTx);
        const txId = decodedTx.txID();
        console.log("this.state.signer.signed", this.state.signer.signed);
        if (!(txId in this.state.signer.signed)) {
          console.error(
            `Tx with id ${txId} has not been signed yet, skipped`,
            txn
          );
          signedTxns.push(null); // send back original txn because it is probably logicsig, or user decided not to sign some specific tx
          // should return null https://github.com/algorandfoundation/ARCs/blob/40d5e9c0f60826e495090a10d278db69233b3063/ARCs/arc-0025.md
          continue;
        }
        const signedUint8 = this.state.signer.signed[txId];
        const b64 = Buffer.from(signedUint8).toString("base64");
        signedTxns.push(b64);
      }

      const response = {
        id: data.id,
        result: signedTxns,
        jsonrpc: "2.0",
      };
      console.log("response", response);
      this.state.wc.web3wallet.respondSessionRequest({
        topic: data.topic,
        response,
      });

      commit("removeRequest", data.id);
    } catch (err) {
      console.error(
        "Error while sending result back to wc2",
        err.Message ?? err
      );
      throw err;
    }
  },
  async cancelRequest({ commit }, { data }) {
    try {
      console.log("cancelRequest", data);
      //data.id, data.transactions
      //const session = await this.state.wc.web3wallet.approveSession({

      if (data.ver != 2) {
        // use WC 1
        return await wc.rejectRequest(data.id);
      }
      const response = {
        id: data.id,
        jsonrpc: "2.0",
        error: {
          code: 5000,
          message: "User rejected.",
        },
      };
      console.log("response", response);
      this.state.wc.web3wallet.respondSessionRequest({
        topic: data.topic,
        response,
      });

      commit("removeRequest", data.id);
    } catch (err) {
      commit("removeRequest", data.id);
      console.error(
        "Error while sending result back to wc2",
        err.Message ?? err
      );
      throw err;
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
