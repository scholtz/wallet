import algosdk from "algosdk";
import WalletConnect from "@walletconnect/client";

import db from "../shared/db";

export default (() => {
  const state = {
    store: null,
    connectorById: {},
    requestById: {},
  };

  const removeConnector = async (id) => {
    const { connector, requests } = state.connectorById[id];

    if (connector) {
      connector.off("disconnect");

      try {
        await connector.killSession();
      } catch {}

      delete state.connectorById[id];

      for (const id of requests) {
        state.store.commit("wc/removeRequest", id);
        delete state.requestById[id];
      }
    }

    state.store.commit("wc/removeConnector", id);

    await db.wc.delete(id);
  };

  const addConnector = (connector, auth, address) => {
    const id = connector.clientId;

    state.connectorById[id] = {
      connector,
      requests: [],
    };

    connector.on("session_request", async (error, payload) => {
      if (error) {
        throw error;
      }

      const meta = payload.params[0].peerMeta;

      state.store.commit("wc/updateConnector", {
        id: id,
        update: {
          peer: {
            url: meta.url,
            name: meta.name,
            description: meta.description,
            icons: meta.icons,
          },
        },
      });

      const response = {
        accounts: [address],
        chainId: 4160,
      };

      connector.approveSession(response);

      const data = JSON.stringify(connector.session);
      const cipher = await state.store.dispatch("wallet/encrypt", { data });

      await db.wc.add({
        id: id,
        name: state.store.state.wallet.name,
        addr: address,
        auth: auth,
        data: cipher,
      });
    });

    connector.on("call_request", async (error, payload) => {
      if (error) {
        throw error;
      }

      if (payload.method != "algo_signTxn") {
        const response = {
          id: request.id,
          error: {
            code: 4300,
            message: "Unsupported request.",
          },
        };

        connector.rejectRequest(response);
        return;
      }

      const transactions = payload.params[0].map((item, index) => {
        const txn = item["txn"];
        const decoded = algosdk.decodeUnsignedTransaction(
          Buffer.from(txn, "base64")
        );

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
        };
      });

      let totalFee = 0;

      for (const tx of transactions) {
        if (tx.fee) {
          totalFee += tx.fee;
        }
      }

      state.requestById[payload.id] = {
        payload: payload,
        connector: connector,
        auth: auth,
        address: address,
      };

      state.connectorById[id].requests.push(payload.id);

      const request = {
        id: payload.id,
        method: payload.method,
        transactions: transactions,
        fee: totalFee,
      };

      state.store.commit("wc/addRequest", { request });
    });

    connector.on("connect", () => {
      state.store.commit("wc/updateConnector", {
        id: connector.clientId,
        update: { connected: true },
      });
    });

    connector.on("disconnect", async () => {
      await removeConnector(connector.clientId);
    });

    state.store.commit("wc/addConnector", {
      id: connector.clientId,
      address: address,
      auth: auth,
      connected: connector.connected,
      requests: [],
    });
  };

  const restoreConnector = (auth, address, session) => {
    const connector = new WalletConnect({
      session: session,
      sessionStorage: {
        getSession: () => {
          return null;
        },
      },
    });

    addConnector(connector, auth, address);

    const meta = session.peerMeta;

    state.store.commit("wc/updateConnector", {
      id: session.clientId,
      update: {
        peer: {
          url: meta.url,
          name: meta.name,
          description: meta.description,
          icons: meta.icons,
        },
      },
    });
  };

  const clear = () => {
    for (const id in state.connectorById) {
      const { connector } = state.connectorById[id];

      connector.transportClose();
      connector.off("session_request");
      connector.off("call_request");
      connector.off("connect");
      connector.off("disconnect");
    }

    state.connectorById = {};
    state.requestById = {};

    state.store.commit("wc/clear");
  };

  return {
    initialize: (store) => {
      state.store = store;
    },
    clear,
    restore: async () => {
      clear();
      const name = state.store.state.wallet.name;
      await db.wc.where({ name: name }).each(async ({ auth, addr, data }) => {
        const plain = await state.store.dispatch("wallet/decrypt", { data });
        const session = JSON.parse(plain);
        restoreConnector(auth, addr, session);
      });
    },
    createConnector: (uri, auth, address) => {
      const connector = new WalletConnect({
        uri: uri,
        session: {},
        sessionStorage: {
          getSession: () => {
            return null;
          },
        },
      });

      addConnector(connector, auth, address);
    },
    addConnector,
    removeConnector,
    acceptRequest: async (id) => {
      const { payload, connector, auth, address } = state.requestById[id];

      const signedTxns = await Promise.all(
        payload.params[0].map(async (item) => {
          const txn = item["txn"];
          const decoded = algosdk.decodeUnsignedTransaction(
            Buffer.from(txn, "base64")
          );

          const signers = item["signers"];

          if (signers !== undefined) {
            if (signers.length == 0) {
              return null;
            }
          }

          if (decoded.from) {
            const from = algosdk.encodeAddress(decoded.from.publicKey);
            if (from != address) {
              return null;
            }
          }

          const stx = await state.store.dispatch("signer/signTransaction", {
            from: address,
            signator: auth,
            tx: decoded,
          });

          if (!stx) {
            throw "Failed to sign transaction";
          }

          const b64 = Buffer.from(stx).toString("base64");
          return b64;
        })
      );

      const response = {
        id: id,
        result: signedTxns,
      };

      connector.approveRequest(response);

      delete state.requestById[id];

      state.store.commit("wc/removeRequest", id);
    },
    rejectRequest: (id) => {
      const { connector } = state.requestById[id];

      if (connector) {
        const response = {
          id: id,
          error: {
            code: 4001,
            message: "The user rejected the request.",
          },
        };

        connector.rejectRequest(response);

        delete state.requestById[id];
      }

      state.store.commit("wc/removeRequest", id);
    },
  };
})();
