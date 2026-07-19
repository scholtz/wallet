import type { ActionTree } from "vuex";
import algosdk from "algosdk";
import type { RootState } from "./index";

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
  fee?: number;
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

// Cross-checks the suggested params returned by the configured node against
// the network the user believes they are on (audit finding AW-2026-005) —
// a malicious/compromised node must not be able to have the wallet sign a
// transaction that is valid on a different network than the one shown in
// the UI. Mirrors the guard Sign.vue applies to externally supplied txns.
const assertParamsMatchNetwork = (
  rootState: RootState,
  params: algosdk.SuggestedParams
): void => {
  const env = rootState.config.env;
  if (!env) return;
  const genesisId = params.genesisID;
  if (genesisId && genesisId !== env) {
    throw new Error(
      `The configured node returned genesis id "${genesisId}" which does not match the selected network "${env}". Refusing to build the transaction.`
    );
  }
  const knownNetwork = rootState.publicData?.genesisList?.find(
    (network) => network.network === env
  );
  const caip10 = knownNetwork?.CAIP10;
  if (typeof caip10 === "string" && caip10 && params.genesisHash) {
    const hashB64 = Buffer.from(params.genesisHash).toString("base64");
    if (!hashB64.startsWith(caip10)) {
      throw new Error(
        `The configured node returned a genesis hash that does not match the selected network "${env}". Refusing to build the transaction.`
      );
    }
  }
};

const resolveSenderAddress = (account: PaymentAccount): string => {
  return typeof account === "string" ? account : account.addr;
};

const normalizeAssetId = (
  asset?: number | string | bigint
): number | undefined => {
  if (asset === undefined) {
    return undefined;
  }
  const parsed = Number(asset);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildAssetCreateTransaction = (
  asset: AssetDefinition,
  params: algosdk.SuggestedParams
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
    Buffer.from(asset.assetMetadataHash ?? "", "base64")
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
  async preparePayment({ dispatch, rootState }, payload: PreparePaymentPayload) {
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
        | algosdk.Transaction
        | undefined;
      if (!txn) {
        return undefined;
      }

      const signedTxn = (await dispatch(
        "signer/signTransaction",
        { from: payload.payFrom, tx: txn },
        { root: true }
      )) as Uint8Array | Buffer;

      const algodClient = createAlgodClient(rootState);
      try {
        const ret = await algodClient.sendRawTransaction(signedTxn).do();
        await dispatch(
          "wallet/lastPayTo",
          { addr: payload.payTo },
          { root: true }
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
    { signedTxn }: SendRawTransactionPayload
  ): Promise<algosdk.modelsv2.PostTransactionsResponse> {
    const algodClient = createAlgodClient(rootState);
    return algodClient.sendRawTransaction(signedTxn).do();
  },
  async makeAssetCreateTxnWithSuggestedParamsTx(
    { rootState },
    { asset }: AssetPayload
  ) {
    const algodClient = createAlgodClient(rootState);
    const params = await algodClient.getTransactionParams().do();
    assertParamsMatchNetwork(rootState, params);
    const txn = buildAssetCreateTransaction(asset, params);
    return txn;
  },
  async makeAssetCreateTxnWithSuggestedParams(
    { dispatch, rootState },
    { asset }: AssetPayload
  ) {
    const algodClient = createAlgodClient(rootState);
    const params = await algodClient.getTransactionParams().do();
    assertParamsMatchNetwork(rootState, params);
    const txn = buildAssetCreateTransaction(asset, params);

    const signedTxn = (await dispatch(
      "signer/signTransaction",
      { from: asset.addr, tx: txn },
      { root: true }
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
    { txId, timeout }: WaitForConfirmationPayload
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
    { groups }: { groups: Uint8Array[][] }
  ): Promise<algosdk.modelsv2.SimulateResponse> {
    const algodClient = createAlgodClient(rootState);
    const txnGroups = groups.map(
      (group) =>
        new algosdk.modelsv2.SimulateRequestTransactionGroup({
          txns: group.map((bytes) => algosdk.decodeSignedTransaction(bytes)),
        })
    );
    const request = new algosdk.modelsv2.SimulateRequest({
      txnGroups,
      allowEmptySignatures: true,
      allowUnnamedResources: true,
    });
    return algodClient.simulateTransactions(request).do();
  },
};

export default {
  namespaced: true,
  state,
  actions,
};
