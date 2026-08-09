import algosdk, { Transaction, type EncodedMultisig } from "algosdk";
import Algorand from "@ledgerhq/hw-app-algorand";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import WalletConnect from "@walletconnect/client";
import UniversalProvider from "universal-provider-with-algorand";

// @walletconnect/client (v1) depends on its own @walletconnect/types@1.8.0,
// which isn't hoisted to (and is incompatible with) the top-level
// @walletconnect/types@2.x this project depends on for WalletConnect v2 - so
// its option/session types are derived structurally off WalletConnect's own
// constructor rather than imported by package name.
type WcV1ConnectorOptions = ConstructorParameters<typeof WalletConnect>[0];
type WcV1Session = NonNullable<WcV1ConnectorOptions["session"]>;
import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";
import { hdSignTransactionBytes } from "../scripts/encoding/hdWallet";
import {
  Arc60Error,
  computeArc60Digest,
  domainMatchesSessionOrigin,
  signArc60DigestWithHd,
  signArc60DigestWithSk,
  validateAuthenticatorDataDomain,
} from "../scripts/encoding/arc60";

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

interface SignArc60DataPayload {
  from: string;
  data: Uint8Array;
  authenticatorData: Uint8Array;
  domain: string;
  /** The requesting WalletConnect session's real peer origin (session.peer.metadata.url), not DApp-supplied - see AW-2026-044. */
  sessionOrigin: string | undefined;
  /** Addresses approved for the WalletConnect session the request arrived on - see AW-2026-046. */
  approvedAccounts: string[];
}

export interface SignerState {
  signed: Record<string, Uint8Array>;
  toSign: Record<string, unknown> | undefined;
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

// Rekey mappings are per-network (an account can be rekeyed to a different
// signer on each chain), so which mapping applies must follow the network the
// transaction itself was built for, not whatever network happens to be
// selected in the UI right now. A tx keeps its embedded genesisID even after
// the user switches the app's active network, so resolving via
// rootState.config.env here would pick the wrong rekeyed signer (and produce
// a signature that's invalid for the network the tx actually targets) any
// time the two differ - e.g. a tx built while on the wrong network, or an
// externally supplied (WalletConnect/pasted) tx for a network other than the
// one currently selected. Falls back to the selected network only when the
// tx has no genesisID at all.
const resolveTxEnv = (rootState: RootState, tx: Transaction): string => {
  const genesisId = (tx as unknown as { genesisID?: string })?.genesisID;
  if (typeof genesisId === "string" && genesisId.length > 0) {
    return genesisId;
  }
  return ensureEnv(rootState);
};

const ensureAccount = (
  rootState: RootState,
  address: string,
  missingMessage: string = missingAccountMessage,
): PrivateAccount => {
  const account = rootState.wallet.privateAccounts.find(
    (item) => item.addr === address,
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
  originalAddress: string,
): PrivateAccount => {
  const envRekey = account.data?.[env]?.rekeyedTo;
  if (typeof envRekey === "string" && envRekey !== originalAddress) {
    return ensureAccount(rootState, envRekey, missingRekeyMessage);
  }
  return account;
};

// Raw wire-format decode of a (possibly partially-signed) multisig
// transaction blob. algosdk.decodeObj() only returns `unknown` (it's a raw
// msgpack decode, not routed through any of algosdk's own Encoded*/Transaction
// classes), so this is the actual shape of what comes back: the multisig
// envelope (msig) is a real algosdk type, while `txn` stays in its raw
// wire-encoded field-name form (re-encoded/decoded into a proper
// algosdk.Transaction only where needed, via encodeObj + decodeUnsignedTransaction).
interface DecodedMultisigTxn {
  txn: Record<string, unknown>;
  msig: EncodedMultisig;
  sig?: Uint8Array;
}

const decodeMultisigTxn = (msigTx: Uint8Array) =>
  algosdk.decodeObj(msigTx) as DecodedMultisigTxn;

// Mirrors the historical `error?.response ? error.response : error?.message
// ?? String(error)` shape used by every signing action's catch block, but
// works from `unknown` (the type TS actually gives caught errors) instead of
// `any`. `response` is read off dynamically since it comes from arbitrary
// signing-transport errors (WalletConnect/Ledger/network) with no shared
// error type in this codebase.
const describeSignerError = (error: unknown): string => {
  if (error && typeof error === "object") {
    const withDetails = error as { response?: unknown; message?: unknown };
    if (withDetails.response !== undefined) {
      return typeof withDetails.response === "string"
        ? withDetails.response
        : JSON.stringify(withDetails.response);
    }
    if (typeof withDetails.message === "string") {
      return withDetails.message;
    }
  }
  return String(error);
};

const state = (): SignerState => ({
  signed: {},
  toSign: undefined,
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

  clearToSign(currentState) {
    currentState.toSign = undefined;
  },

  // Invoked on a confirmed network switch (see config/setEnv) so that a
  // signature produced while on one network can never linger and be mistaken
  // for "already signed" once the user has moved to another network.
  clearSignedCache(currentState) {
    currentState.signed = {};
    currentState.toSign = undefined;
    currentState.toSignArray = [];
  },
};

const actions: ActionTree<SignerState, RootState> = {
  async clearToSign({ commit }) {
    commit("clearToSign");
  },
  async signTransaction(
    { dispatch, rootState },
    payload: SignTransactionPayload,
  ): Promise<undefined | Uint8Array<ArrayBufferLike>> {
    try {
      const env = resolveTxEnv(rootState, payload.tx);
      const baseAccount = ensureAccount(rootState, payload.from);
      const signerAccount = resolveEnvRekey(
        rootState,
        baseAccount,
        env,
        payload.from,
      );
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
      if (signerAccount.type === "hd") {
        return await dispatch("signByHd", {
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
          signerAccount.params,
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
    } catch (error: unknown) {
      console.error("error", error, dispatch);
      const msg = describeSignerError(error);
      dispatch("toast/openError", msg, {
        root: true,
      });
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
  getSignerType(
    { dispatch, rootState },
    { from, tx }: { from: string; tx?: Transaction },
  ): "ledger" | "msig" | "sk" | "hd" | "?" {
    try {
      const env = tx ? resolveTxEnv(rootState, tx) : ensureEnv(rootState);
      const baseAccount = ensureAccount(rootState, from);
      const resolvedAccount = resolveEnvRekey(
        rootState,
        baseAccount,
        env,
        from,
      );
      if (resolvedAccount.type === "ledger") {
        return "ledger";
      }
      if (resolvedAccount.type === "hd") {
        return "hd";
      }
      if (resolvedAccount.params) {
        return "msig";
      }
      if (resolvedAccount.sk) {
        return "sk";
      }
      return "?";
    } catch (error: unknown) {
      console.error("error", error, dispatch);
      const msg = describeSignerError(error);
      dispatch("toast/openError", msg, {
        root: true,
      });
      return "?";
    }
  },
  async signByLedger(
    { commit, rootState },
    payload: SignByPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const fromAccount = ensureAccount(rootState, payload.from);
    const transport = await TransportWebUSB.request();
    const algo = new Algorand(transport);
    const slot = fromAccount.slot ?? 0;
    const { signature } = await algo.sign(
      `44'/283'/${slot}'/0/0`,
      Buffer.from(payload.tx.toByte()).toString("hex"),
    );
    if (!signature) {
      throw new Error("Ledger signature missing");
    }
    const sigBytes = new Uint8Array(signature).slice(0, 64);
    const signedResult = payload.tx.attachSignature(payload.from, sigBytes) as
      | Uint8Array
      | Record<string, unknown>;
    const signedBytes = toSignedBytes(signedResult);
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  async signByWC1(
    { commit, rootState },
    payload: SignByPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const fromAccount = ensureAccount(rootState, payload.from);
    const connector = new WalletConnect({
      // WalletAccount["session"] is kept as `unknown` (see src/store/wallet.ts)
      // since WC-specific session typing is owned by a separate, concurrent
      // change; this is the shape WalletConnect v1 itself expects it to be.
      session: fromAccount.session as WcV1Session | undefined,
      // Note: the connector options' real storage-override key is "storage",
      // not "sessionStorage" - this mismatched key is pre-existing behavior
      // (effectively a no-op) preserved as-is; renaming it would change
      // runtime behavior, which is out of scope for a types-only pass.
      sessionStorage: {
        getSession: () => null,
      },
    } as WcV1ConnectorOptions & { sessionStorage: { getSession: () => null } });
    const request = {
      method: "algo_signTxn",
      params: [
        [
          {
            txn: Buffer.from(
              algosdk.encodeUnsignedTransaction(payload.tx),
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
  async signByWC2(
    { dispatch, commit },
    payload: SignByPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    // wcClient's own "init" action returns exactly this type (see
    // src/store/wcClient.ts's UniversalProviderInstance), but vuex's
    // dispatch() return type isn't tied to the action name, so it still
    // needs an explicit assertion here.
    const provider = (await dispatch("wcClient/init", null, {
      root: true,
    })) as UniversalProvider;
    const currentChain = await dispatch("publicData/getCurrentChainId", null, {
      root: true,
    });
    const request = {
      method: "algo_signTxn",
      params: [
        [
          {
            txn: Buffer.from(
              algosdk.encodeUnsignedTransaction(payload.tx),
            ).toString("base64"),
            authAddr: payload.from,
          },
        ],
      ],
    };
    const response = (await provider.request(
      request,
      `algorand:${currentChain}`,
    )) as string[];
    if (!response) {
      throw new Error("Transaction has not been signed");
    }
    const signedBytes = new Uint8Array(Buffer.from(response[0], "base64"));
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  async signByHd(
    { commit, rootState },
    payload: SignByPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const fromAccount = ensureAccount(rootState, payload.from);
    if (!fromAccount.hdRootAddr) {
      throw new Error("HD wallet root account address was not found");
    }
    const rootAccount = ensureAccount(rootState, fromAccount.hdRootAddr);
    if (!rootAccount.hdMnemonic) {
      throw new Error("HD wallet master mnemonic was not found");
    }
    const sig = await hdSignTransactionBytes(
      rootAccount.hdMnemonic,
      fromAccount.hdAccountIndex ?? 0,
      0,
      payload.tx.bytesToSign(),
    );
    const signedResult = payload.tx.attachSignature(payload.from, sig) as
      | Uint8Array
      | Record<string, unknown>;
    const signedBytes = toSignedBytes(signedResult);
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  async signBySk(
    { dispatch, commit },
    payload: SignByPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const sk: Uint8Array | null = await dispatch(
      "wallet/getSK",
      { addr: payload.from },
      { root: true },
    );
    if (!sk) {
      throw new Error("Private key not found");
    }
    const signedBytes = payload.tx.signTxn(sk);
    commit("setSigned", signedBytes);
    return signedBytes;
  },
  // ARC-60 arbitrary data signing (AUTH scope). Only sk and hd account types
  // are supported: ledger/msig/wc signers have no defined ARC-60 signing
  // path, and msig combination doesn't make sense for a single auth
  // signature. Domain-binding validation runs here (not just in the caller)
  // so it can never be skipped regardless of call site.
  async signArc60Data(
    { dispatch, rootState },
    payload: SignArc60DataPayload,
  ): Promise<Uint8Array> {
    const domainValid = await validateAuthenticatorDataDomain(
      payload.authenticatorData,
      payload.domain,
    );
    if (!domainValid) {
      throw new Arc60Error(
        "ERROR_FAILED_DOMAIN_AUTH",
        "authenticatorData does not match the requesting domain.",
      );
    }
    // AW-2026-044: the check above is self-referential (both halves come
    // from the same DApp request) and cannot be trusted on its own - cross
    // check the claimed domain against the actual WalletConnect session peer.
    if (!domainMatchesSessionOrigin(payload.domain, payload.sessionOrigin)) {
      throw new Arc60Error(
        "ERROR_FAILED_DOMAIN_AUTH",
        "Requested domain does not match the connected DApp's origin.",
      );
    }
    // AW-2026-046: don't let a session approved for one account request a
    // signature from an account it was never granted.
    if (!payload.approvedAccounts.includes(payload.from)) {
      throw new Arc60Error(
        "ERROR_UNAUTHORIZED_SIGNER",
        "The requested signer account is not part of this WalletConnect session.",
      );
    }
    const digest = await computeArc60Digest(
      payload.data,
      payload.authenticatorData,
    );
    const baseAccount = ensureAccount(rootState, payload.from);
    const env = ensureEnv(rootState);
    const signerAccount = resolveEnvRekey(rootState, baseAccount, env, payload.from);
    if (signerAccount.type === "hd") {
      if (!signerAccount.hdRootAddr) {
        throw new Error("HD wallet root account address was not found");
      }
      const rootAccount = ensureAccount(rootState, signerAccount.hdRootAddr);
      if (!rootAccount.hdMnemonic) {
        throw new Error("HD wallet master mnemonic was not found");
      }
      return await signArc60DigestWithHd(
        rootAccount.hdMnemonic,
        signerAccount.hdAccountIndex ?? 0,
        digest,
      );
    }
    if (signerAccount.sk) {
      const sk: Uint8Array | null = await dispatch(
        "wallet/getSK",
        { addr: signerAccount.addr },
        { root: true },
      );
      if (!sk) {
        throw new Error("Private key not found");
      }
      return signArc60DigestWithSk(digest, sk);
    }
    throw new Error(
      `Arbitrary data signing is not supported for account ${signerAccount.addr}`,
    );
  },
  async createMultisigTransaction(
    { rootState },
    { txn }: { txn: algosdk.Transaction },
  ) {
    if (!txn || !txn.sender?.publicKey) {
      throw new Error("Transaction object is not correct");
    }
    const env = resolveTxEnv(rootState, txn);
    const from = algosdk.encodeAddress(txn.sender.publicKey);
    const baseAccount = ensureAccount(rootState, from);
    const signerAccount = resolveEnvRekey(rootState, baseAccount, env, from);
    if (!signerAccount.params) {
      throw new Error(`Address is not multisig: ${signerAccount.addr}`);
    }
    return algosdk.createMultisigTransaction(txn, signerAccount.params);
  },
  async signMultisig(
    { dispatch, rootState },
    payload: MultisigPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
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
  async signMultisigBySk(
    { commit, rootState },
    payload: MultisigPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    if (!payload.txn) {
      throw new Error("Txn cannot be empty");
    }
    const signatorAccount = ensureAccount(rootState, payload.signator);
    const signedTxn = decodeMultisigTxn(payload.msigTx);
    const rawSk = signatorAccount.sk;
    if (!rawSk) {
      throw new Error("Secret key not found for signator");
    }
    const skBytes =
      rawSk instanceof Uint8Array
        ? rawSk
        : new Uint8Array(
            Buffer.from(Object.values(rawSk as Record<string, number>)),
          );
    const sigInnerTx = algosdk.signTransaction(payload.txn, skBytes);
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx.blob);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig, index: number) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr === payload.signator) {
        keyExist = true;
        signedTxn.msig.subsig[index].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(
        `Multisig key is missing for address ${payload.signator}`,
      );
    }
    const ret = algosdk.encodeObj(signedTxn);
    commit("setSigned", ret);
    return ret;
  },
  async signMultisigByLedger(
    { dispatch, commit },
    payload: MultisigPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const signedTxn = decodeMultisigTxn(payload.msigTx);
    const txn = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(signedTxn.txn),
    );
    const sigInnerTx = await dispatch("signByLedger", {
      from: payload.signator,
      tx: txn,
    });
    const sigInnerTxObj = algosdk.decodeSignedTransaction(sigInnerTx);
    let keyExist = false;
    signedTxn.msig.subsig.forEach((subsig, index: number) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr === payload.signator) {
        keyExist = true;
        signedTxn.msig.subsig[index].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(
        `Multisig key is missing for address ${payload.signator}`,
      );
    }
    const ret = algosdk.encodeObj(signedTxn);
    commit("setSigned", ret);
    return ret;
  },
  async signMultisigByWC(
    { dispatch, commit, rootState },
    payload: MultisigPayload,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const signedTxn = decodeMultisigTxn(payload.msigTx);
    const txn = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(signedTxn.txn),
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
    signedTxn.msig.subsig.forEach((subsig, index: number) => {
      const subsigAddr = algosdk.encodeAddress(subsig.pk);
      if (subsigAddr === payload.signator) {
        keyExist = true;
        signedTxn.msig.subsig[index].s = sigInnerTxObj.sig;
      }
    });
    if (!keyExist) {
      throw new Error(
        `Multisig key is missing for address ${payload.signator}`,
      );
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
