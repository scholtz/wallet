import algosdk, { type Transaction } from "algosdk";
import WalletConnect from "@walletconnect/client";
import type { Store } from "vuex";
import type { Table } from "dexie";

import db from "./db";
import type { RootState } from "../store";
import {
  decodeSignTxnTransactions,
  type DecodedTransactionSummary,
} from "./decodeSignRequests";
import {
  MAX_DAPP_TXNS_PER_REQUEST,
  admitEnvelope,
  admitTransactions,
  countPending,
} from "../scripts/liquid/guards";
import { checkTransactionGroup, findGenesisMismatch } from "../scripts/dappRequestChecks";

interface WalletConnectRecord {
  id: string;
  name: string;
  addr: string;
  data: string;
}

// Derived from the class itself (rather than imported by name from
// "@walletconnect/types") because pnpm's non-hoisted node_modules resolves
// that package specifier to the v2 types used elsewhere in this app
// (SessionTypes etc., for @walletconnect/core / WalletKit) - @walletconnect/
// client@1.8.0's own v1 IWalletConnectOptions/IWalletConnectSession types
// are only reachable through its nested dependency, not the top-level
// specifier. ConstructorParameters/InstanceType sidestep that ambiguity.
type WalletConnectV1Options = ConstructorParameters<typeof WalletConnect>[0];
type WalletConnectV1Session = NonNullable<WalletConnectV1Options["session"]>;

type WalletConnectConnector = InstanceType<typeof WalletConnect> & {
  clientId: string;
  connected: boolean;
  session: WalletConnectV1Session;
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

interface WalletConnectPeerMeta {
  url?: string;
  name?: string;
  description?: string;
  icons?: string[];
}

interface SessionRequestPayload {
  params: Array<{ peerMeta: WalletConnectPeerMeta }>;
}

interface AlgoTxnParam {
  txn: string;
  signers?: string[];
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

/**
 * Decode a v1 request with the same decoder the v2 / Liquid / Direct transports use, so the
 * summary fields are populated correctly (algosdk v3 keeps amount/asset under payment.* /
 * assetTransfer.*). Pre-signed blobs are returned, not registered, until the request is admitted.
 */
const decodeTransactions = (
  rawTransactions: AlgoTxnParam[]
): { transactions: DecodedTransactionSummary[]; preSigned: Uint8Array[] } => {
  const preSigned: Uint8Array[] = [];
  const transactions = decodeSignTxnTransactions(rawTransactions, (signed) => {
    preSigned.push(signed);
  });
  // Validate every blob before any is registered.
  preSigned.forEach((signed) => algosdk.decodeSignedTransaction(signed));
  return { transactions, preSigned };
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

  const reject = (code: number, message: string) => {
    console.error("WalletConnect v1 request refused:", message);
    store.dispatch(
      "toast/openError",
      `A dApp request was rejected: ${message}`,
      { root: true }
    );
    connector.rejectRequest({ id: payload.id, error: { code, message } });
  };

  // Same admission rules as the other dApp transports (AW-2026-062): caps and duplicate ids,
  // then a group check and the sender scope below.
  const rawTransactions: AlgoTxnParam[] = Array.isArray(payload.params?.[0])
    ? payload.params[0]
    : [];
  const envelope = admitEnvelope({
    count: rawTransactions.length,
    maxCount: MAX_DAPP_TXNS_PER_REQUEST,
    ...countPending(
      store.state.wc.requests,
      store.state.wc.signDataRequests,
      String(connector.clientId),
      payload.id
    ),
  });
  if (!envelope.ok) {
    if (!envelope.silent) reject(envelope.code, envelope.reason);
    return;
  }

  let decoded: ReturnType<typeof decodeTransactions>;
  try {
    decoded = decodeTransactions(rawTransactions);
  } catch (error) {
    console.error("Undecodable WalletConnect v1 transactions", error);
    reject(4200, "Invalid transaction.");
    return;
  }
  const { transactions, preSigned } = decoded;
  if (findGenesisMismatch(transactions.map((tx) => tx.txn), store.state.config.env) !== undefined) {
    reject(4200, "A transaction is for a different network than the selected one.");
    return;
  }
  if (checkTransactionGroup(transactions.map((tx) => tx.txn)) !== "ok") {
    reject(4200, "Incomplete or inconsistent transaction group.");
    return;
  }
  // The v1 session is bound to the one account chosen when pairing.
  const admission = admitTransactions({
    transactions: transactions.map((tx, i) => ({
      sender: tx.txn?.sender?.toString(),
      preSigned: tx.preSigned,
      signers: rawTransactions[i]?.signers,
    })),
    approved: [address],
    own: store.state.wallet.privateAccounts.map((a) => a.addr),
  });
  if (!admission.ok) {
    reject(admission.code, admission.reason);
    return;
  }
  preSigned.forEach((signed) =>
    store.commit("signer/setSigned", signed, { root: true })
  );
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
      ver: "1",
      topic: String(connector.clientId),
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
  session: WalletConnectV1Session
): void => {
  // `sessionStorage` is deliberately not passed here: @walletconnect/client's
  // WalletConnect wrapper never forwards it to the underlying Connector (see
  // its constructor - only cryptoLib/connectorOpts/pushServerOpts reach
  // super()), so it would have zero effect at runtime either way. This app
  // persists/restores v1 sessions itself via `wcTable` (Dexie) instead.
  const connector = new WalletConnect({ session });

  addConnector(connector as WalletConnectConnector, address);

  const store = requireStore();
  const meta = session.peerMeta ?? { description: "", url: "", icons: [], name: "" };
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
      const session = JSON.parse(plain) as WalletConnectV1Session;
      restoreConnector(addr, session);
    });
  },
  createConnector: (uri: string, address: string) => {
    const connector = new WalletConnect({
      uri,
      // Empty placeholder, not a real restored session - `uri` drives the
      // new pairing handshake instead. Cast preserves the exact pre-existing
      // runtime value (kept for behavior parity with the code this replaced).
      // `sessionStorage` omitted - see the comment in `restoreConnector`.
      session: {} as WalletConnectV1Session,
    });

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
          // Raw msgpack-decoded signature bytes when the item is already a
          // signed-transaction envelope, absent for a bare unsigned txn.
          sig?: Uint8Array;
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
