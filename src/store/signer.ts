import algosdk, { Transaction } from "algosdk";
import Algorand from "@ledgerhq/hw-app-algorand";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import WalletConnect from "@walletconnect/client";
import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";

const missingAccountMessage =
  "The from address is not in the list of accounts.";
const missingRekeyMessage =
  "The rekeyed signator address from is not in the list of accounts.";
const envErrorMessage =
  "Environment is not properly configured. Please switch to another network and select your network again.";

type PrivateAccount = RootState["wallet"]["privateAccounts"][number];

type SignedTxnInput = Uint8Array | Buffer | Record<string, unknown>;

interface SignTransactionPayload {
  from: string;
  signator?: string;
  tx: Transaction;
}

interface ToSignPayload {
  tx: Record<string, unknown>;
}

interface ToSignArrayPayload {
  txs: unknown[];
}

interface SetSignedPayload {
  signed: SignedTxnInput;
}

interface SignByPayload {
  from: string;
  tx: Transaction;
}

interface MultisigPayload {
  msigTx: Uint8Array;
  signator: string;
  txn?: Transaction;
}

export interface SignerState {
  signed: Record<string, Uint8Array>;
  toSign: Record<string, unknown>;
  toSignArray: unknown[];
  returnTo: string;
  returnToSignAll: string;
}

const toSignedBytes = (signed: SignedTxnInput): Uint8Array => {
  if (signed instanceof Uint8Array) {
    return signed;
  }
  return algosdk.encodeObj(signed as Record<string, unknown>);
};

const ensureEnv = (rootState: RootState): string => {
  if (!rootState.config.env) {
    throw new Error(envErrorMessage);
  }
  return rootState.config.env;
};

const ensureAccount = (
  rootState: RootState,
  address: string,
  missingMessage: string = missingAccountMessage
): PrivateAccount => {
  const account = rootState.wallet.privateAccounts.find(
    (item) => item.addr === address
  );
  if (!account) {
    throw new Error(missingMessage);
  }
  return account;
};

const resolveEnvRekey = (
  rootState: RootState,
  account: PrivateAccount,
  env: string,
  originalAddress: string
): PrivateAccount => {
  const envRekey = account.data?.[env]?.rekeyedTo;
  if (envRekey && envRekey !== originalAddress) {
    return ensureAccount(rootState, envRekey, missingRekeyMessage);
  }
  return account;
};

const decodeMultisigTxn = (msigTx: Uint8Array) =>
  algosdk.decodeObj(msigTx) as Record<string, any>;

const state = (): SignerState => ({
  signed: {},
  toSign: {},
  toSignArray: [],
  returnTo: "",
  returnToSignAll: "",
});

const mutations: MutationTree<SignerState> = {
  setSigned(currentState, signed: SignedTxnInput) {
    const bytes = toSignedBytes(signed);
    const tx = algosdk.decodeSignedTransaction(bytes);
    const txId = tx.txn.txID();
    currentState.signed[txId] = bytes;
  },
  toSign(currentState, tx: Record<string, unknown>) {
    currentState.toSign = tx;
  },
  toSignArray(currentState, txs: unknown[]) {
    currentState.toSignArray = txs;
  },
  returnTo(currentState, returnTo: string) {
    currentState.returnTo = returnTo;
  },
  returnToSignAll(currentState, returnToSignAll: string) {
    currentState.returnToSignAll = returnToSignAll;
  },
};

const actions: ActionTree<SignerState, RootState> = {
  async signTransaction({ dispatch, rootState }, payload: SignTransactionPayload) {
    try {
      const env = ensureEnv(rootState);
      const baseAccount = ensureAccount(rootState, payload.from);
      const signerAccount = resolveEnvRekey(rootState, baseAccount, env, payload.from);
      if (signerAccount.type === "ledger") {
        return await dispatch("signByLedger", {
          from: signerAccount.addr,
          tx: payload.tx,
        });
      }
      if (signerAccount.type === "wc" && signerAccount.ver === "2") {
        return await dispatch("signByWC2", {
          from: signerAccount.addr,
          tx: payload.tx,
        });
      }
      if (signerAccount.type === "wc") {
        return await dispatch("signByWC1", {
          from: signerAccount.addr,
          tx: payload.tx,
        });
      }
      if (signerAccount.params) {
        if (!payload.signator) {
          throw new Error("Missing signator for multisig transaction.");
        }
        const msigTx = algosdk.createMultisigTransaction(
          payload.tx,
          signerAccount.params
        );
        return await dispatch("signMultisig", {
          msigTx,
          signator: payload.signator,
        });
      }
      if (signerAccount.sk) {
        return await dispatch("signBySk", {
          from: payload.from,
          tx: payload.tx,
        });
      }
    } catch (error: any) {
      console.error("error", error, dispatch);
      const msg = error?.response ? error.response : error?.message ?? String(error);
      dispatch(
        "toast/openError",
        msg,
        {
          root: true,
        }
      );
    }
    return undefined;
  },
  async toSign({ commit }, payload: ToSignPayload) {
    commit("toSign", payload.tx);
  },
  async toSignArray({ commit }, payload: ToSignArrayPayload) {
    commit("toSignArray", payload.txs);
  },
  async returnTo({ commit }, returnTo: string) {
    commit("returnTo", returnTo);
  },
  async returnToSignAll({ commit }, returnToSignAll: string) {
    commit("returnToSignAll", returnToSignAll);
  },
  async setSigned({ commit }, payload: SetSignedPayload) {
    commit("setSigned", payload.signed);
  },
  getSignerType({ dispatch, rootState }, { from }: { from: string }) {
    try {
      const env = ensureEnv(rootState);
      const baseAccount = ensureAccount(rootState, from);
      const resolvedAccount = resolveEnvRekey(rootState, baseAccount, env, from);
      if (resolvedAccount.type === "ledger") {
        return "ledger";
      }
      if (resolvedAccount.params) {
        return "msig";
      }
      if (resolvedAccount.sk) {
        return "sk";
      }
      return "?";
    } catch (error: any) {
      console.error("error", error, dispatch);
      const msg = error?.response ? error.response : error?.message ?? String(error);
      dispatch(
        "toast/openError",
        msg,
        {
          root: true,
        }
      );
      return "?";
    }
  },
  async signByLedger({ commit, rootState }, payload: SignByPayload) {
    const fromAccount = ensureAccount(rootState, payload.from);
    const transport = await TransportWebUSB.request();
    const algo = new Algorand(transport);
    const slot = fromAccount.slot ?? 0;
    const { signature } = await algo.sign(
      `44'/283'/${slot}'/0/0`,
      Buffer.from(payload.tx.toByte()).toString("hex")
    );
    if (!signature) {
      throw new Error("Ledger signature missing");
    }
    const sigBytes = new Uint8Array(signature).slice(0, 64);
    const signedResult = payload.tx.attachSignature(
      payload.from,
      sigBytes
    ) as Uint8Array | Record<string, unknown>;
    const signedBytes = toSignedBytes(signedResult);
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  async signByWC1({ commit, rootState }, payload: SignByPayload) {
    const fromAccount = ensureAccount(rootState, payload.from);
    const connector = new WalletConnect({
      session: fromAccount.session,
      sessionStorage: {
        getSession: () => null,
      },
    } as any);
    const request = {
      method: "algo_signTxn",
      params: [
        [
          {
            txn: Buffer.from(
              algosdk.encodeUnsignedTransaction(payload.tx)
            ).toString("base64"),
            authAddr: payload.from,
          },
        ],
      ],
    };
    const response = await connector.sendCustomRequest(request);
    const signedBytes = new Uint8Array(Buffer.from(response[0], "base64"));
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  async signByWC2({ dispatch, commit, rootState }, payload: SignByPayload) {
    const provider = (await dispatch("wcClient/init", null, {
      root: true,
    })) as any;
    const currentChain = await dispatch(
      "publicData/getCurrentChainId",
      null,
      { root: true }
    );
    const request = {
      method: "algo_signTxn",
      params: [
        [
          {
            txn: Buffer.from(
              algosdk.encodeUnsignedTransaction(payload.tx)
            ).toString("base64"),
            authAddr: payload.from,
          },
        ],
      ],
    };
    const response = (await provider.request(
      request,
      `algorand:${currentChain}`
    )) as string[];
    if (!response) {
      throw new Error("Transaction has not been signed");
    }
    const signedBytes = new Uint8Array(Buffer.from(response[0], "base64"));
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  async signBySk({ dispatch, commit }, payload: SignByPayload) {
    const sk: Uint8Array | null = await dispatch(
      "wallet/getSK",
      { addr: payload.from },
      { root: true }
    );
    if (!sk) {
      throw new Error("Private key not found");
    }
    const signedBytes = payload.tx.signTxn(sk);
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  async createMultisigTransaction({ rootState }, { txn }: { txn: Record<string, any> }) {
    if (!txn || !txn.from?.publicKey) {
      throw new Error("Transaction object is not correct");
    }
    const env = ensureEnv(rootState);
    const from = algosdk.encodeAddress(txn.from.publicKey);
    const baseAccount = ensureAccount(rootState, from);
    const signerAccount = resolveEnvRekey(rootState, baseAccount, env, from);
    if (!signerAccount.params) {
      throw new Error(`Address is not multisig: ${signerAccount.addr}`);
    }
    return algosdk.createMultisigTransaction(
      txn as unknown as Transaction,
      signerAccount.params
    );
  },
  async signMultisig({ dispatch, rootState }, payload: MultisigPayload) {
    const signatorAccount = ensureAccount(rootState, payload.signator);
    if (signatorAccount.type === "ledger") {
      return await dispatch("signMultisigByLedger", payload);
    }
    if (signatorAccount.type === "wc") {
      return await dispatch("signMultisigByWC", payload);
    }
    if (signatorAccount.sk) {
      return await dispatch("signMultisigBySk", payload);
    }
    throw new Error(`Signator account ${payload.signator} not supported`);
  },
  async signMultisigBySk({ commit, rootState }, payload: MultisigPayload) {
    if (!payload.txn) {
      throw new Error("Txn cannot be empty");
    }
    const signatorAccount = ensureAccount(rootState, payload.signator);
    const signedTxn = decodeMultisigTxn(payload.msigTx);
    const sender = algosdk.encodeAddress(signedTxn.txn.snd);
    let fromAccount = ensureAccount(rootState, sender);
    if (fromAccount.rekeyedTo && fromAccount.rekeyedTo !== sender) {
      fromAccount = ensureAccount(rootState, fromAccount.rekeyedTo, missingRekeyMessage);
    }
    const rawSk = signatorAccount.sk;
    if (!rawSk) {
      throw new Error("Secret key not found for signator");
    }
    const skBytes =
      rawSk instanceof Uint8Array
        ? rawSk
        : new Uint8Array(
            Buffer.from(Object.values(rawSk as Record<string, number>))
          );
    const sigInnerTx = algosdk.signTransaction(payload.txn, skBytes);
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx.blob);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig: any, index: number) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr === payload.signator) {
        keyExist = true;
        signedTxn.msig.subsig[index].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(`Multisig key is missing for address ${payload.signator}`);
    }
    const ret = algosdk.encodeObj(signedTxn);
    commit("setSigned", ret);
    return ret;
  },
  async signMultisigByLedger({ dispatch, commit }, payload: MultisigPayload) {
    const signedTxn = decodeMultisigTxn(payload.msigTx);
    const txn = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(signedTxn.txn)
    );
    const sigInnerTx = await dispatch("signByLedger", {
      from: payload.signator,
      tx: txn,
    });
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig: any, index: number) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr === payload.signator) {
        keyExist = true;
        signedTxn.msig.subsig[index].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(`Multisig key is missing for address ${payload.signator}`);
    }
    const ret = algosdk.encodeObj(signedTxn);
    commit("setSigned", ret);
    return ret;
  },
  async signMultisigByWC({ dispatch, commit, rootState }, payload: MultisigPayload) {
    const signedTxn = decodeMultisigTxn(payload.msigTx);
    const txn = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(signedTxn.txn)
    );
    const signatorAccount = ensureAccount(rootState, payload.signator);
    let sigInnerTx: Uint8Array;
    if (signatorAccount.ver === "2") {
      sigInnerTx = await dispatch("signByWC2", {
        from: payload.signator,
        tx: txn,
      });
    } else {
      sigInnerTx = await dispatch("signByWC1", {
        from: payload.signator,
        tx: txn,
      });
    }
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig: any, index: number) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr === payload.signator) {
        keyExist = true;
        signedTxn.msig.subsig[index].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(`Multisig key is missing for address ${payload.signator}`);
    }
    const ret = algosdk.encodeObj(signedTxn);
    commit("setSigned", ret);
    return ret;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
