import algosdk, { type Transaction } from "algosdk";
import WalletConnect from "@walletconnect/client";
import type { Store } from "vuex";
import type { Table } from "dexie";

import db from "./db";
import type { RootState } from "../store";

interface WalletConnectRecord {
  id: string;
  name: string;
  addr: string;
  data: string;
}

/* eslint-disable no-unused-vars */
type WalletConnectConnector = InstanceType<typeof WalletConnect> & {
  clientId: string;
  connected: boolean;
  session: unknown;
  killSession(): Promise<void>;
  approveSession(_response: { accounts: string[]; chainId: number }): void;
  approveRequest(_response: {
    id: string | number;
    result: (string | null)[];
  }): void;
  rejectRequest(_response: {
    id: string | number;
    error: { code: number; message: string };
  }): void;
  transportClose(): void;
};
/* eslint-enable no-unused-vars */

interface WalletConnectPeerMeta {
  url?: string;
  name?: string;
  description?: string;
  icons?: string[];
}

interface WalletConnectSession {
  clientId: string;
  peerMeta: WalletConnectPeerMeta;
}

interface SessionRequestPayload {
  params: Array<{ peerMeta: WalletConnectPeerMeta }>;
}

interface AlgoTxnParam {
  txn: string;
}

interface WalletConnectRequestPayload {
  id: number | string;
  method: string;
  params: Array<AlgoTxnParam[]>;
}

interface ConnectorEntry {
  connector: WalletConnectConnector;
  requests: string[];
}

interface RequestEntry {
  payload: WalletConnectRequestPayload;
  connector: WalletConnectConnector;
  address: string;
}

interface WalletConnectState {
  store: Store<RootState> | null;
  connectorById: Record<string, ConnectorEntry>;
  requestById: Record<string, RequestEntry>;
}

interface DecodedTxnFields {
  type: string;
  fee?: number;
  amount?: number | string | bigint;
  assetIndex?: number | string;
  from?: { publicKey: Uint8Array };
  rekeyTo?: { publicKey: Uint8Array };
}

interface TransactionPreview {
  index: number;
  type: string;
  from?: string;
  fee?: number | bigint;
  asset: string | number;
  amount?: string | number | bigint;
  rekeyTo?: string;
  txn: Transaction;
}

const wcTable: Table<WalletConnectRecord, string> = db.table("wc");

const state: WalletConnectState = {
  store: null,
  connectorById: {},
  requestById: {},
};

const toRequestKey = (id: string | number): string => String(id);

const requireStore = (): Store<RootState> => {
  if (!state.store) {
    throw new Error("WalletConnect store has not been initialized");
  }
  return state.store;
};

const decodeTransactions = (
  payload: WalletConnectRequestPayload
): TransactionPreview[] => {
  const store = requireStore();
  const [group] = payload.params ?? [];
  if (!Array.isArray(group)) {
    return [];
  }

  return group.map((item, index) => {
    const txnB64 = item.txn;
    const txnBuffer = Buffer.from(txnB64, "base64");
    const decodedObj = algosdk.decodeObj(txnBuffer) as Record<
      string,
      unknown
    > & {
      type?: string;
      txn?: Record<string, unknown> & { type?: string };
      sig?: unknown;
    };

    let decodedTx = decodedObj;
    if (!decodedTx.type && decodedTx.txn?.type) {
      if (decodedTx.sig) {
        store.dispatch("signer/setSigned", {
          signed: new Uint8Array(txnBuffer),
        });
      }
      decodedTx = decodedTx.txn;
    }

    const decoded = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(decodedTx as Record<string, unknown>)
    ) as Transaction & DecodedTxnFields;

    let asset: string | number = "";
    switch (decoded.type) {
      case "pay":
        asset = "ALGO";
        break;
      case "axfer":
        asset = decoded.assetIndex ?? "";
        break;
    }

    let amount: string | number | bigint | undefined = decoded.amount;
    if (decoded.type === "pay" || decoded.type === "axfer") {
      amount = amount ?? "0";
    }

    let from: string | undefined;
    if (decoded.from?.publicKey) {
      from = algosdk.encodeAddress(decoded.from.publicKey);
    }

    let rekeyTo: string | undefined;
    if (decoded.rekeyTo?.publicKey) {
      rekeyTo = algosdk.encodeAddress(decoded.rekeyTo.publicKey);
    }

    return {
      index,
      type: decoded.type,
      from,
      fee: decoded.fee,
      asset,
      amount,
      rekeyTo,
      txn: decoded,
    };
  });
};

const removeConnector = async (id: string): Promise<void> => {
  const entry = state.connectorById[id];
  if (!entry) {
    return;
  }
  const store = requireStore();
  const { connector, requests } = entry;

  connector.off("disconnect");
  try {
    await connector.killSession();
  } catch (error) {
    console.error(error);
  }

  delete state.connectorById[id];

  for (const requestId of requests) {
    store.commit("wc/removeRequest", requestId);
    delete state.requestById[requestId];
  }

  store.commit("wc/removeConnector", id);
  await wcTable.delete(id);
};

const handleSessionRequest = (
  connector: WalletConnectConnector,
  address: string,
  payload: SessionRequestPayload
): void => {
  const store = requireStore();
  const meta = payload.params[0]?.peerMeta ?? {};

  store.commit("wc/updateConnector", {
    id: connector.clientId,
    update: {
      peer: {
        url: meta.url,
        name: meta.name,
        description: meta.description,
        icons: meta.icons,
      },
    },
  });

  connector.approveSession({
    accounts: [address],
    chainId: 4160,
  });

  const data = JSON.stringify(connector.session);
  store
    .dispatch("wallet/encrypt", { data })
    .then((cipher) =>
      wcTable.add({
        id: connector.clientId,
        name: store.state.wallet.name,
        addr: address,
        data: cipher,
      })
    )
    .catch((error) => console.error("WC session persistence failed", error));
};

const handleCallRequest = async (
  connector: WalletConnectConnector,
  address: string,
  payload: WalletConnectRequestPayload
): Promise<void> => {
  const store = requireStore();
  if (payload.method !== "algo_signTxn") {
    connector.rejectRequest({
      id: payload.id,
      error: {
        code: 4300,
        message: "Unsupported request.",
      },
    });
    return;
  }

  const transactions = decodeTransactions(payload);
  const totalFee = transactions.reduce(
    (sum, tx) => sum + Number(tx.fee ?? 0),
    0
  );

  const requestKey = toRequestKey(payload.id);
  state.requestById[requestKey] = {
    payload,
    connector,
    address,
  };

  const connectorEntry = state.connectorById[String(connector.clientId)];
  if (connectorEntry) {
    connectorEntry.requests.push(requestKey);
  }

  store.commit("wc/addRequest", {
    request: {
      id: payload.id,
      method: payload.method,
      transactions,
      fee: totalFee,
    },
  });
};

const addConnector = (
  connector: WalletConnectConnector,
  address: string
): void => {
  const store = requireStore();
  const id = String(connector.clientId);

  state.connectorById[id] = {
    connector,
    requests: [],
  };

  connector.on(
    "session_request",
    async (error: Error | null, payload: SessionRequestPayload) => {
      if (error) {
        throw error;
      }
      handleSessionRequest(connector, address, payload);
    }
  );

  connector.on(
    "call_request",
    async (error: Error | null, payload: WalletConnectRequestPayload) => {
      if (error) {
        throw error;
      }
      await handleCallRequest(connector, address, payload);
    }
  );

  connector.on("connect", () => {
    store.commit("wc/updateConnector", {
      id: connector.clientId,
      update: { connected: true },
    });
  });

  connector.on("disconnect", async () => {
    await removeConnector(id);
  });

  store.commit("wc/addConnector", {
    id: connector.clientId,
    address,
    connected: connector.connected,
    requests: [],
  });
};

const restoreConnector = (
  address: string,
  session: WalletConnectSession
): void => {
  const connector = new WalletConnect({
    session,
    sessionStorage: {
      getSession: () => null,
    },
  } as any);

  addConnector(connector as WalletConnectConnector, address);

  const store = requireStore();
  const meta = session.peerMeta ?? {};
  store.commit("wc/updateConnector", {
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

const clear = (): void => {
  const store = requireStore();
  for (const id of Object.keys(state.connectorById)) {
    const { connector } = state.connectorById[id];
    connector.transportClose();
    connector.off("session_request");
    connector.off("call_request");
    connector.off("connect");
    connector.off("disconnect");
  }

  state.connectorById = {};
  state.requestById = {};

  store.commit("wc/clear");
};

export default (() => ({
  initialize: (store: Store<RootState>) => {
    state.store = store;
  },
  clear,
  restore: async () => {
    clear();
    const store = requireStore();
    const name = store.state.wallet.name;
    await wcTable.where({ name }).each(async ({ addr, data }) => {
      const plain = await store.dispatch("wallet/decrypt", { data });
      const session = JSON.parse(plain) as WalletConnectSession;
      restoreConnector(addr, session);
    });
  },
  createConnector: (uri: string, address: string) => {
    const connector = new WalletConnect({
      uri,
      session: {} as WalletConnectSession,
      sessionStorage: {
        getSession: () => null,
      },
    } as any);

    addConnector(connector as WalletConnectConnector, address);
  },
  addConnector,
  removeConnector,
  acceptRequest: async (id: string | number) => {
    const requestKey = toRequestKey(id);
    const entry = state.requestById[requestKey];
    if (!entry) {
      return;
    }
    const store = requireStore();
    const { payload, connector } = entry;
    const signedTxns: (string | null)[] = [];

    const [group] = payload.params ?? [];
    if (Array.isArray(group)) {
      for (const item of group) {
        const txnBuffer = Buffer.from(item.txn, "base64");
        const decodedObj = algosdk.decodeObj(txnBuffer) as Record<
          string,
          unknown
        > & {
          type?: string;
          txn?: Record<string, unknown> & { type?: string };
          sig?: unknown;
        };
        let decodedTx = decodedObj;
        if (!decodedTx.type && decodedTx.txn?.type) {
          if (decodedTx.sig) {
            store.dispatch("signer/setSigned", {
              signed: new Uint8Array(txnBuffer),
            });
          }
          decodedTx = decodedTx.txn;
        }
        const decoded = algosdk.decodeUnsignedTransaction(
          algosdk.encodeObj(decodedTx as Record<string, unknown>)
        ) as Transaction;

        const txId = decoded.txID();
        const signedMap = store.state.signer.signed;
        if (!(txId in signedMap)) {
          console.error(
            `Tx with id ${txId} has not been signed yet, skipped`,
            item
          );
          signedTxns.push(null);
          continue;
        }
        const signedUint8 = signedMap[txId];
        const b64 = Buffer.from(signedUint8).toString("base64");
        signedTxns.push(b64);
      }
    }

    connector.approveRequest({
      id,
      result: signedTxns,
    });

    delete state.requestById[requestKey];

    store.commit("wc/removeRequest", requestKey);
  },
  rejectRequest: (id: string | number) => {
    const requestKey = toRequestKey(id);
    const entry = state.requestById[requestKey];
    const store = requireStore();
    if (entry?.connector) {
      entry.connector.rejectRequest({
        id,
        error: {
          code: 4001,
          message: "The user rejected the request.",
        },
      });
      delete state.requestById[requestKey];
    }

    store.commit("wc/removeRequest", requestKey);
  },
}))();
