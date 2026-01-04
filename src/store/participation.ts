import algosdk from "algosdk";
import type { ActionContext, ActionTree } from "vuex";
import type { ConfigState } from "./config";
import type { RootState } from "./index";

export interface ParticipationState {}

interface ParticipationKeyResponse {
  selectionKey: string;
  stateProofKey: string;
  voteKey: string;
  voteKeyDilution: number;
}

interface ParticipationPayload {
  account: string;
  rounds: number;
  participationAuth: string;
}

interface SetAccountOnlinePayload extends ParticipationPayload {
  stakingRegistration?: boolean;
}

interface AccountPayload {
  account: string;
}

const state = (): ParticipationState => ({});

const ensureParticipationHost = (config: ConfigState): string => {
  if (!config.participation) {
    throw new Error("Please setup participation server in your settings.");
  }
  return config.participation;
};

const getAlgodClient = (config: ConfigState): algosdk.Algodv2 => {
  const url = new URL(config.algod);
  return new algosdk.Algodv2(config.algodToken, config.algod, url.port);
};

const getFirstValidRound = (params: algosdk.SuggestedParams): number => {
  const firstValid = (params as { firstValid?: number | bigint }).firstValid;
  if (typeof firstValid === "bigint") {
    return Number(firstValid);
  }
  if (typeof firstValid === "number") {
    return firstValid;
  }
  const firstRound = (params as { firstRound?: number }).firstRound;
  if (typeof firstRound === "number") {
    return firstRound;
  }
  return 0;
};

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    const errObj = error as {
      response?: unknown;
      message?: string;
    };
    const response = errObj.response as
      | { message?: string; body?: { message?: string } }
      | string
      | undefined;
    if (typeof response === "string") {
      return response;
    }
    if (response?.message) {
      return response.message;
    }
    if (response?.body?.message) {
      return response.body.message;
    }
    if (errObj.message) {
      return errObj.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Error occurred, please try again later";
};

type DispatchFn = ActionContext<ParticipationState, RootState>["dispatch"];

const openToastError = async (
  dispatch: DispatchFn,
  error: unknown
): Promise<void> => {
  const message = extractErrorMessage(error);
  await dispatch("toast/openError", message, {
    root: true,
  });
};

const createKeyRegistrationPayload = (
  account: string,
  suggestedParams: algosdk.SuggestedParams,
  participationData: ParticipationKeyResponse,
  voteFirst: number,
  voteLast: number
) => ({
  from: account,
  suggestedParams,
  selectionKey: participationData.selectionKey,
  stateProofKey: participationData.stateProofKey,
  voteFirst,
  voteLast,
  voteKey: participationData.voteKey,
  voteKeyDilution: participationData.voteKeyDilution,
});

const actions: ActionTree<ParticipationState, RootState> = {
  async getARC14ParticipationRealm({ dispatch, rootState }) {
    const host = ensureParticipationHost(rootState.config);
    const data = await dispatch(
      "axios/get",
      {
        url: `${host}/v1/participation/realm`,
      },
      { root: true }
    );
    return data;
  },
  async getParticipationData(
    { dispatch, rootState },
    { account, rounds, participationAuth }: ParticipationPayload
  ) {
    try {
      if (!account) {
        throw new Error("Address not found.");
      }
      const host = ensureParticipationHost(rootState.config);
      const algodClient = getAlgodClient(rootState.config);
      const suggestedParams = await algodClient.getTransactionParams().do();
      const voteFirst = getFirstValidRound(suggestedParams) + 2;
      const voteLast = voteFirst + rounds;
      const data = (await dispatch(
        "axios/get",
        {
          url: `${host}/v1/KMD/addpartkey?roundFirstValid=${voteFirst}&roundLastValid=${voteLast}&address=${account}`,
          headers: {
            Authorization: participationAuth,
          },
        },
        { root: true }
      )) as ParticipationKeyResponse | undefined;
      if (!data) {
        throw new Error("Unable to create participation key");
      }
      suggestedParams.fee = BigInt(1000);
      suggestedParams.flatFee = true;
      return createKeyRegistrationPayload(
        account,
        suggestedParams,
        data,
        voteFirst,
        voteLast
      );
    } catch (error) {
      console.error("getParticipationData", error);
      await openToastError(dispatch, error);
      return undefined;
    }
  },
  async setAccountOnline(
    { dispatch, rootState },
    {
      account,
      rounds,
      participationAuth,
      stakingRegistration,
    }: SetAccountOnlinePayload
  ) {
    try {
      if (!account) {
        throw new Error("Address not found.");
      }
      const host = ensureParticipationHost(rootState.config);
      const algodClient = getAlgodClient(rootState.config);
      const suggestedParams = await algodClient.getTransactionParams().do();
      const voteFirst = getFirstValidRound(suggestedParams) + 2;
      const voteLast = voteFirst + rounds;
      const data = (await dispatch(
        "axios/get",
        {
          url: `${host}/v1/KMD/addpartkey?roundFirstValid=${voteFirst}&roundLastValid=${voteLast}&address=${account}`,
          headers: {
            Authorization: participationAuth,
          },
        },
        { root: true }
      )) as ParticipationKeyResponse | undefined;
      if (!data) {
        throw new Error("Unable to create participation key");
      }
      suggestedParams.fee = BigInt(1000);
      suggestedParams.flatFee = true;
      const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: account,
        suggestedParams,
        selectionKey: new Uint8Array(Buffer.from(data.selectionKey, "base64")),
        stateProofKey: new Uint8Array(
          Buffer.from(data.stateProofKey, "base64")
        ),
        voteFirst,
        voteLast,
        voteKey: new Uint8Array(Buffer.from(data.voteKey, "base64")),
        voteKeyDilution: data.voteKeyDilution,
      });
      if (stakingRegistration) {
        txn.fee = BigInt(2_000_000);
      }
      const signedTxn = (await dispatch(
        "signer/signTransaction",
        { from: account, tx: txn },
        { root: true }
      )) as Uint8Array;
      const ret = await algodClient.sendRawTransaction(signedTxn).do();
      return ret?.txid;
    } catch (error) {
      console.error("setAccountOnline", error);
      await openToastError(dispatch, error);
      return undefined;
    }
  },
  async setAccountOffline(
    { dispatch, rootState },
    { account }: AccountPayload
  ) {
    try {
      if (!account) {
        throw new Error("Address not found.");
      }
      ensureParticipationHost(rootState.config);
      const algodClient = getAlgodClient(rootState.config);
      const suggestedParams = await algodClient.getTransactionParams().do();
      suggestedParams.fee = BigInt(1000);
      suggestedParams.flatFee = true;
      const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: account,
        suggestedParams,
      });
      const signedTxn = (await dispatch(
        "signer/signTransaction",
        { from: account, tx: txn },
        { root: true }
      )) as Uint8Array;
      const ret = await algodClient.sendRawTransaction(signedTxn).do();
      return ret?.txid;
    } catch (error) {
      console.error("setAccountOffline", error);
      await openToastError(dispatch, error);
      return undefined;
    }
  },
  async getAccountOfflineTx({ rootState }, { account }: AccountPayload) {
    try {
      if (!account) {
        throw new Error("Address not found.");
      }
      ensureParticipationHost(rootState.config);
      const algodClient = getAlgodClient(rootState.config);
      const suggestedParams = await algodClient.getTransactionParams().do();
      suggestedParams.fee = BigInt(1000);
      suggestedParams.flatFee = true;
      return algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: account,
        suggestedParams,
      });
    } catch (error) {
      console.error("getAccountOfflineTx", error);
      return undefined;
    }
  },
};

export default {
  namespaced: true,
  state,
  actions,
};
