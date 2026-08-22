import type { ActionTree } from "vuex";
import algosdk from "algosdk";
import type { RootState } from "./index";
import {
  MAX_AUTO_FEE_MICROALGOS,
  resolveRequiredFee,
  type FeeEstimate,
} from "../scripts/fees";

export interface AlgodState {}

interface AlgodConfig {
  algod: string;
  algodToken: string;
}

type PaymentAccount = string | { addr: string; sk?: Uint8Array };

type PaymentAmount = number | bigint;

type OptionalNote = Uint8Array | undefined;

export interface PreparePaymentPayload {
  payTo: string;
  payFrom: PaymentAccount;
  amount: PaymentAmount;
  noteEnc?: OptionalNote;
  fee?: number | bigint;
  asset?: number | string | bigint;
  reKeyTo?: string;
}

export interface PaymentPayload extends PreparePaymentPayload {}

interface AssetDefinition {
  addr: string;
  note?: string;
  totalIssuance: number | string | bigint;
  decimals: number;
  defaultFrozen: boolean;
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
  unitName?: string;
  assetName?: string;
  assetURL?: string;
  assetMetadataHash?: string;
}

interface AssetPayload {
  asset: AssetDefinition;
}

interface SendRawTransactionPayload {
  signedTxn: Uint8Array | Buffer;
}

interface WaitForConfirmationPayload {
  txId: string;
  timeout: number;
}

interface GetApplicationPayload {
  appIndex: bigint | number;
}

export interface ApplicationPrograms {
  approvalProgram: Uint8Array;
  clearStateProgram: Uint8Array;
}

const state = (): AlgodState => ({});

const getAlgodConfig = (rootState: RootState): AlgodConfig => {
  const { algod, algodToken } = rootState.config as Partial<AlgodConfig>;
  if (!algod || !algodToken) {
    throw new Error("Algod configuration is missing.");
  }
  return { algod, algodToken };
};

const createAlgodClient = (rootState: RootState): algosdk.Algodv2 => {
  const { algod, algodToken } = getAlgodConfig(rootState);
  const url = new URL(algod);
  return new algosdk.Algodv2(algodToken, algod, url.port);
};

// AlgorandPublicData's genesis-list.json publishes CAIP10 as a CAIP-2
// chain-reference: the genesis hash, base64url-encoded (RFC 4648 §5, "-"/"_"
// instead of "+"/"/", no "=" padding) and truncated to 32 chars, since CAIP-2
// references are restricted to `[-a-zA-Z0-9]{1,32}`. e.g. for voimain-v1.0,
// genesisHash "r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=" (standard
// base64) is published as CAIP10 "r20fSQI8gWe_kFZziNonSPCXLwcQmH_n" - same
// bytes, different alphabet. Must convert with the same alphabet before
// comparing, or every genesis hash whose relevant prefix contains a "+"/"/"
// (as this one does) always fails the check even when it's exactly correct.
const bytesToBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const base64UrlToBase64 = (input: string): string => {
  const standard = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = standard.length % 4;
  return pad ? standard + "=".repeat(4 - pad) : standard;
};

// Cross-checks the suggested params returned by the configured node against
// the network the user believes they are on (audit finding AW-2026-005) —
// a malicious/compromised node must not be able to have the wallet sign a
// transaction that is valid on a different network than the one shown in
// the UI. Mirrors the guard Sign.vue applies to externally supplied txns.
const assertParamsMatchNetwork = (
  rootState: RootState,
  params: algosdk.SuggestedParams,
): void => {
  const env = rootState.config.env;
  // "custom" is a UI placeholder, not a genesis id — the user has manually
  // configured their own node endpoints, so there is no selected network to
  // cross-check the node's genesis against.
  if (!env || env === "custom") return;
  const genesisId = params.genesisID;
  if (genesisId && genesisId !== env) {
    throw new Error(
      `The configured node returned genesis id "${genesisId}" which does not match the selected network "${env}". Refusing to build the transaction.`,
    );
  }
  const knownNetwork = rootState.publicData?.genesisList?.find(
    (network) => network.network === env,
  );
  const caip10 = knownNetwork?.CAIP10;
  if (typeof caip10 === "string" && caip10 && params.genesisHash) {
    const hashB64Url = bytesToBase64Url(params.genesisHash);
    if (!hashB64Url.startsWith(caip10)) {
      const receivedHex = Buffer.from(params.genesisHash).toString("hex");
      const expectedHex = Buffer.from(
        base64UrlToBase64(caip10),
        "base64",
      ).toString("hex");
      throw new Error(
        `The configured node returned a genesis hash that does not match the selected network "${env}". Expected (from CAIP10) hex: ${expectedHex}. Received (from node) hex: ${receivedHex}. Refusing to build the transaction.`,
      );
    }
  }
};

const resolveSenderAddress = (account: PaymentAccount): string => {
  return typeof account === "string" ? account : account.addr;
};

// Whether the effective signer for the given address is a Falcon-1024
// (post-quantum) account — either directly, or via a rekey to one. Matters
// for fees: a Falcon signature adds 2,000,000 usage (see scripts/fees.ts),
// which simulate cannot see when run with allowEmptySignatures.
const isFalcon1024Signer = (
  rootState: RootState,
  senderAddr: string,
): boolean => {
  const accounts = rootState.wallet.privateAccounts;
  const account = accounts.find((a) => a.addr === senderAddr);
  if (!account) return false;
  if (account.type === "falcon1024") return true;
  const env = rootState.config.env;
  const rekeyedTo = env ? account.data?.[env]?.rekeyedTo : undefined;
  if (!rekeyedTo) return false;
  return accounts.some(
    (a) => a.addr === rekeyedTo && a.type === "falcon1024",
  );
};

const normalizeAssetId = (
  asset?: number | string | bigint,
): number | undefined => {
  if (asset === undefined) {
    return undefined;
  }
  const parsed = Number(asset);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildAssetCreateTransaction = (
  asset: AssetDefinition,
  params: algosdk.SuggestedParams,
): algosdk.Transaction => {
  if (!asset.manager) {
    asset.manager = asset.addr;
  }
  const enc = new TextEncoder();
  const noteEnc = enc.encode(asset.note ?? "");
  const issueBase = BigInt(asset.totalIssuance);
  const issuePower = BigInt(Math.pow(10, asset.decimals));
  const issueBigInt = issueBase * issuePower;
  const metadataHash = new Uint8Array(
    Buffer.from(asset.assetMetadataHash ?? "", "base64"),
  );

  return algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: asset.addr,
    note: noteEnc,
    total: issueBigInt,
    decimals: Number(asset.decimals),
    defaultFrozen: asset.defaultFrozen,
    manager: asset.manager,
    reserve: asset.reserve ?? undefined,
    freeze: asset.freeze ?? undefined,
    clawback: asset.clawback ?? undefined,
    unitName: asset.unitName,
    assetName: asset.assetName,
    assetURL: asset.assetURL,
    assetMetadataHash: metadataHash,
    suggestedParams: params,
  });
};

const actions: ActionTree<AlgodState, RootState> = {
  async getAlgod({ rootState }) {
    return createAlgodClient(rootState);
  },
  async getTransactionParams({ rootState }) {
    try {
      const algodClient = createAlgodClient(rootState);
      return await algodClient.getTransactionParams().do();
    } catch (error) {
      console.error("Failed to fetch transaction params", error);
      return undefined;
    }
  },
  async preparePayment(
    { dispatch, rootState },
    payload: PreparePaymentPayload,
  ) {
    try {
      const algodClient = createAlgodClient(rootState);
      const fromAcct = resolveSenderAddress(payload.payFrom);
      const params = await algodClient.getTransactionParams().do();
      assertParamsMatchNetwork(rootState, params);

      if (payload.fee !== undefined) {
        params.fee = BigInt(payload.fee);
        params.flatFee = true;
      }

      const assetId = normalizeAssetId(payload.asset);
      if (assetId !== undefined) {
        return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: fromAcct,
          receiver: payload.payTo,
          assetIndex: assetId,
          amount: payload.amount,
          note: payload.noteEnc,
          suggestedParams: params,
          rekeyTo: payload.reKeyTo,
        });
      }

      return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: fromAcct,
        receiver: payload.payTo,
        amount: payload.amount,
        note: payload.noteEnc,
        suggestedParams: params,
        rekeyTo: payload.reKeyTo,
      });
    } catch (error) {
      console.error("Failed to prepare payment", error);
      const message = error instanceof Error ? error.message : String(error);
      dispatch("toast/openError", message, { root: true });
      return undefined;
    }
  },
  async makePayment({ dispatch, rootState }, payload: PaymentPayload) {
    try {
      const txn = (await dispatch("preparePayment", payload)) as
        algosdk.Transaction | undefined;
      if (!txn) {
        return undefined;
      }

      const estimate = (await dispatch("estimateRequiredFee", {
        txn,
        senderAddr: resolveSenderAddress(payload.payFrom),
      })) as FeeEstimate | undefined;
      if (estimate && txn.fee < estimate.requiredFee) {
        if (estimate.requiredFee > MAX_AUTO_FEE_MICROALGOS) {
          dispatch(
            "toast/openError",
            `The network requires a fee of ${Number(estimate.requiredFee) / 1_000_000} ALGO, which exceeds the maximum allowed fee of ${Number(MAX_AUTO_FEE_MICROALGOS) / 1_000_000} ALGO. The transaction was not sent.`,
            { root: true },
          );
          return undefined;
        }
        const previousFee = txn.fee;
        txn.fee = estimate.requiredFee;
        dispatch(
          "toast/openSuccess",
          `Transaction fee adjusted from ${Number(previousFee) / 1_000_000} to ${Number(estimate.requiredFee) / 1_000_000} ALGO based on the network fee simulation.`,
          { root: true },
        );
      }

      const signedTxn = (await dispatch(
        "signer/signTransaction",
        { from: payload.payFrom, tx: txn },
        { root: true },
      )) as Uint8Array | Buffer;

      const algodClient = createAlgodClient(rootState);
      try {
        const ret = await algodClient.sendRawTransaction(signedTxn).do();
        await dispatch(
          "wallet/lastPayTo",
          { addr: payload.payTo },
          { root: true },
        );
        return (ret.txid as string) ?? undefined;
      } catch (error) {
        const responseMessage = (
          error as {
            response?: { body?: { message?: string } };
          }
        )?.response?.body?.message;
        if (responseMessage) {
          dispatch("toast/openError", responseMessage, { root: true });
        }
        console.error("Failed to submit transaction", error);
        return undefined;
      }
    } catch (error) {
      console.error("Failed to make payment", error);
      return undefined;
    }
  },
  async sendRawTransaction(
    { rootState },
    { signedTxn }: SendRawTransactionPayload,
  ): Promise<algosdk.modelsv2.PostTransactionsResponse> {
    const algodClient = createAlgodClient(rootState);
    return algodClient.sendRawTransaction(signedTxn).do();
  },
  async makeAssetCreateTxnWithSuggestedParamsTx(
    { rootState },
    { asset }: AssetPayload,
  ) {
    const algodClient = createAlgodClient(rootState);
    const params = await algodClient.getTransactionParams().do();
    assertParamsMatchNetwork(rootState, params);
    const txn = buildAssetCreateTransaction(asset, params);
    return txn;
  },
  async makeAssetCreateTxnWithSuggestedParams(
    { dispatch, rootState },
    { asset }: AssetPayload,
  ) {
    const algodClient = createAlgodClient(rootState);
    const params = await algodClient.getTransactionParams().do();
    assertParamsMatchNetwork(rootState, params);
    const txn = buildAssetCreateTransaction(asset, params);

    const signedTxn = (await dispatch(
      "signer/signTransaction",
      { from: asset.addr, tx: txn },
      { root: true },
    )) as Uint8Array | Buffer;

    return algodClient.sendRawTransaction(signedTxn).do();
  },
  // Fetches an app's compiled programs so callers (the ARC-56 registry
  // lookup, see src/scripts/arc56/) can hash them and identify the contract
  // being called. Returns undefined rather than throwing on failure — a
  // registry lookup that can't resolve a program just falls back to
  // showing the raw, undecoded call, it's never fatal to signing.
  async getApplicationPrograms(
    { rootState },
    { appIndex }: GetApplicationPayload,
  ): Promise<ApplicationPrograms | undefined> {
    try {
      const algodClient = createAlgodClient(rootState);
      const app = await algodClient.getApplicationByID(appIndex).do();
      if (!app.params) return undefined;
      return {
        approvalProgram: app.params.approvalProgram,
        clearStateProgram: app.params.clearStateProgram,
      };
    } catch (error) {
      console.error("Failed to fetch application programs", error);
      return undefined;
    }
  },
  async waitForConfirmation(
    { rootState },
    { txId, timeout }: WaitForConfirmationPayload,
  ): Promise<algosdk.modelsv2.PendingTransactionResponse | undefined> {
    try {
      if (!txId || timeout < 0) {
        throw new Error("Bad arguments.");
      }
      const algodClient = createAlgodClient(rootState);
      return await algosdk.waitForConfirmation(algodClient, txId, timeout);
    } catch (error) {
      console.error("Failed waiting for confirmation", error);
      return undefined;
    }
  },
  // Dry-runs one or more atomic transaction groups against current ledger
  // state without requiring signatures or broadcasting anything - used to
  // preview the real, ledger-computed outcome of a swap route before signing.
  async simulateTransactionGroups(
    { rootState },
    { groups }: { groups: Uint8Array[][] },
  ): Promise<algosdk.modelsv2.SimulateResponse> {
    const algodClient = createAlgodClient(rootState);
    const txnGroups = groups.map(
      (group) =>
        new algosdk.modelsv2.SimulateRequestTransactionGroup({
          txns: group.map((bytes) => algosdk.decodeSignedTransaction(bytes)),
        }),
    );
    const request = new algosdk.modelsv2.SimulateRequest({
      txnGroups,
      allowEmptySignatures: true,
      allowUnnamedResources: true,
      fixSigners: true,
    });
    return algodClient.simulateTransactions(request).do();
  },
  // Dry-runs a single unsigned transaction to learn the fee the network
  // actually requires (v5.0 usage-based fees: simulate reports groupUsage in
  // millionths of a min fee). The declared fee on a transaction is always
  // spent in full — there is no on-chain max-fee-with-refund — so callers
  // use this to declare exactly the required fee before signing. Returns
  // undefined only when even suggested params can't be fetched.
  async estimateRequiredFee(
    { rootState },
    { txn, senderAddr }: { txn: algosdk.Transaction; senderAddr: string },
  ): Promise<FeeEstimate | undefined> {
    try {
      const algodClient = createAlgodClient(rootState);
      const params = await algodClient.getTransactionParams().do();
      const falcon1024Signer = isFalcon1024Signer(rootState, senderAddr);
      let groupUsage: bigint | undefined;
      let failureMessage: string | undefined;
      try {
        const bytes = algosdk.encodeUnsignedSimulateTransaction(txn);
        const request = new algosdk.modelsv2.SimulateRequest({
          txnGroups: [
            new algosdk.modelsv2.SimulateRequestTransactionGroup({
              txns: [algosdk.decodeSignedTransaction(bytes)],
            }),
          ],
          allowEmptySignatures: true,
          allowUnnamedResources: true,
          fixSigners: true,
        });
        const response = await algodClient.simulateTransactions(request).do();
        const group = response.txnGroups?.[0];
        if (group?.groupUsage !== undefined) {
          groupUsage = BigInt(group.groupUsage);
        }
        failureMessage = group?.failureMessage;
      } catch (error) {
        // Simulation being unavailable (e.g. an older node) must not block
        // the fee check — fall through to the signature-type floor below.
        console.error("Fee simulation failed", error);
      }
      const requiredFee = resolveRequiredFee({
        minFee: BigInt(params.minFee),
        groupUsage,
        falcon1024Signer,
      });
      return { requiredFee, groupUsage, failureMessage };
    } catch (error) {
      console.error("Failed to estimate required fee", error);
      return undefined;
    }
  },
};

export default {
  namespaced: true,
  state,
  actions,
};
