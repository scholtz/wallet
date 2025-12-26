import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";

export interface Fa2State {
  provider2realm: Record<string, unknown>;
}

interface StoreRealmPayload {
  provider: string;
  realm: unknown;
}

interface RealmPayload {
  twoFactorAuthProvider: string;
}

interface SetupAuthenticatorPayload {
  authToken: string;
  account?: string;
  secondaryAccount: string;
  twoFactorAuthProvider: string;
}

interface ConfirmAuthenticatorPayload {
  authToken: string;
  txtCode: string;
  secondaryAccount: string;
  twoFactorAuthProvider: string;
}

interface SignTwoFactorPayload extends ConfirmAuthenticatorPayload {
  rawSignedTxnInput: Uint8Array | string;
}

interface TwoFactorProvider {
  id: string;
  host: string;
  [key: string]: unknown;
}

const state = (): Fa2State => ({
  provider2realm: {},
});

const mutations: MutationTree<Fa2State> = {
  storeRealm(currentState, payload: StoreRealmPayload) {
    currentState.provider2realm[payload.provider] = payload.realm;
  },
};

const actions: ActionTree<Fa2State, RootState> = {
  async getRealm(
    { dispatch, commit, state, rootState },
    { twoFactorAuthProvider }: RealmPayload
  ) {
    if (!twoFactorAuthProvider) {
      throw new Error("TwoFactorAuthProvider not found");
    }
    const cachedRealm = state.provider2realm[twoFactorAuthProvider];
    if (cachedRealm) {
      return cachedRealm;
    }
    const chainId = rootState.config.env;
    const list = (await dispatch(
      "publicData/getTwoFactorAuthList",
      { chainId },
      { root: true }
    )) as TwoFactorProvider[];
    const provider = list.find((p) => p.id === twoFactorAuthProvider);
    if (!provider) {
      throw new Error(
        `Provider with id ${twoFactorAuthProvider} has not been found in the public list for this network`
      );
    }
    const realm = await dispatch(
      "axios/get",
      {
        url: `${provider.host}/v1/Multisig/GetRealm`,
      },
      { root: true }
    );
    if (!realm) {
      throw new Error("Unable to fetch realm from the provider");
    }
    commit("storeRealm", { provider: twoFactorAuthProvider, realm });
    return realm;
  },
  async setupAuthenticator(
    { dispatch, rootState },
    {
      authToken,
      account,
      secondaryAccount,
      twoFactorAuthProvider,
    }: SetupAuthenticatorPayload
  ) {
    if (!twoFactorAuthProvider) {
      throw new Error("TwoFactorAuthProvider not found");
    }
    if (!secondaryAccount) {
      throw new Error("Secondary account is required");
    }
    if (!account) {
      return undefined;
    }
    const config = {
      headers: {
        Authorization: authToken,
      },
    };
    const chainId = rootState.config.env;
    const list = (await dispatch(
      "publicData/getTwoFactorAuthList",
      { chainId },
      { root: true }
    )) as TwoFactorProvider[];
    const provider = list.find((p) => p.id === twoFactorAuthProvider);
    if (!provider) {
      throw new Error("2FA provider not found for current network");
    }
    const addrSubstr = `${account.substring(0, 2)}${account.substring(
      account.length - 2
    )}`;
    const addr2Substr = `${secondaryAccount.substring(
      0,
      2
    )}${secondaryAccount.substring(secondaryAccount.length - 2)}`;
    return dispatch(
      "axios/post",
      {
        url: `${provider.host}/v1/Multisig/SetupAuthenticator`,
        params: {
          accountTitleNoSpaces: `AWallet-${addrSubstr}-${addr2Substr}`,
          secondaryAccount,
        },
        config,
      },
      { root: true }
    );
  },
  async confirmAuthenticator(
    { dispatch, rootState },
    {
      authToken,
      txtCode,
      secondaryAccount,
      twoFactorAuthProvider,
    }: ConfirmAuthenticatorPayload
  ) {
    if (!twoFactorAuthProvider) {
      throw new Error("TwoFactorAuthProvider not found");
    }
    const config = {
      headers: {
        Authorization: authToken,
      },
    };
    const chainId = rootState.config.env;
    const list = (await dispatch(
      "publicData/getTwoFactorAuthList",
      { chainId },
      { root: true }
    )) as TwoFactorProvider[];
    const provider = list.find((p) => p.id === twoFactorAuthProvider);
    if (!provider) {
      throw new Error("2FA provider not found for current network");
    }
    return dispatch(
      "axios/post",
      {
        url: `${provider.host}/v1/Multisig/ConfirmSetupAuthenticator`,
        params: { txtCode, secondaryAccount },
        config,
      },
      { root: true }
    );
  },
  async signTwoFactor(
    { dispatch, rootState },
    {
      rawSignedTxnInput,
      secondaryAccount,
      txtCode,
      authToken,
      twoFactorAuthProvider,
    }: SignTwoFactorPayload
  ) {
    if (!twoFactorAuthProvider) {
      throw new Error("TwoFactorAuthProvider not found");
    }
    const config = {
      headers: {
        Authorization: authToken,
      },
    };
    const chainId = rootState.config.env;
    const list = (await dispatch(
      "publicData/getTwoFactorAuthList",
      { chainId },
      { root: true }
    )) as TwoFactorProvider[];

    const provider = list.find((p) => p.id === twoFactorAuthProvider);
    if (!provider) {
      throw new Error("2FA provider not found for current network");
    }
    return dispatch(
      "axios/post",
      {
        url: `${provider.host}/v1/Multisig/SignWithTwoFactorPINMsigTx`,
        params: {
          txtCode,
          signedTxMsgPack: rawSignedTxnInput,
          secondaryAccount,
        },
        config,
      },
      { root: true }
    );
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
