import algosdk from "algosdk";
import { ActionTree } from "vuex";

const state = () => ({
  provider2realm: {},
});

const mutations = {
  storeRealm(state, provider, realm) {
    state.provider2realm[provider] = realm;
    console.log("state.provider2realm", state.provider2realm);
  },
};
const actions = {
  async getRealm({ dispatch, commit }, { twoFactorAuthProvider }) {
    if (!twoFactorAuthProvider) {
      console.error(
        "getRealm triggered but not provided twoFactorAuthProvider"
      );
      return "";
    }
    if (this.state.fa2.provider2realm[twoFactorAuthProvider]) {
      return this.state.fa2.provider2realm[twoFactorAuthProvider];
    }
    const chainId = this.state.config.env;
    const list = await dispatch(
      "publicData/getTwoFactorAuthList",
      { chainId },
      { root: true }
    );
    console.log("list", twoFactorAuthProvider, list);
    const provider = list.find((p) => p.id == twoFactorAuthProvider);
    if (!provider) return "";
    const ret = await dispatch(
      "axios/get",
      {
        url: `${provider.host}/v1/Multisig/GetRealm`,
      },
      { root: true }
    );
    await commit("storeRealm", twoFactorAuthProvider, ret);
    return ret;
    //return "2FA#ARC14";
  },
  async setupAuthenticator(
    { dispatch },
    { authToken, account, secondaryAccount, twoFactorAuthProvider }
  ) {
    const config = {
      headers: {
        Authorization: authToken,
      },
    };
    const chainId = this.state.config.env;
    const list = await dispatch(
      "publicData/getTwoFactorAuthList",
      { chainId },
      { root: true }
    );
    const provider = list.find((p) => p.id == twoFactorAuthProvider);
    if (!provider) throw "Provider not found";
    console.log("config", config);
    if (!account) return;
    console.log("provider", provider);
    const addrSubstr =
      account.substring(0, 2) + account.substring(account.length - 2);
    const addr2Substr =
      secondaryAccount.substring(0, 2) +
      secondaryAccount.substring(secondaryAccount.length - 2);
    return await dispatch(
      "axios/post",
      {
        url: `${provider.host}/v1/Multisig/SetupAuthenticator`,
        params: {
          accountTitleNoSpaces: "AWallet-" + addrSubstr + "-" + addr2Substr,
          secondaryAccount,
        },
        config,
      },
      { root: true }
    );
  },
  async confirmAuthenticator(
    { dispatch },
    { authToken, txtCode, secondaryAccount, twoFactorAuthProvider }
  ) {
    const config = {
      headers: {
        Authorization: authToken,
      },
    };
    const chainId = this.state.config.env;
    const list = await dispatch(
      "publicData/getTwoFactorAuthList",
      { chainId },
      { root: true }
    );
    const provider = list.find((p) => p.id == twoFactorAuthProvider);
    if (!provider) throw "Provider not found";
    return await dispatch(
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
    { dispatch },
    {
      rawSignedTxnInput,
      secondaryAccount,
      txtCode,
      authToken,
      twoFactorAuthProvider,
    }
  ) {
    try {
      const config = {
        headers: {
          Authorization: authToken,
        },
      };
      const chainId = this.state.config.env;
      const list = await dispatch(
        "publicData/getTwoFactorAuthList",
        { chainId },
        { root: true }
      );

      const provider = list.find((p) => p.id == twoFactorAuthProvider);
      const signedTxMsgPack = rawSignedTxnInput;

      if (!provider) {
        console.error(
          "Provider not found",
          provider,
          twoFactorAuthProvider,
          list
        );
        throw "Provider not found";
      }
      return await dispatch(
        "axios/post",
        {
          url: `${provider.host}/v1/Multisig/SignWithTwoFactorPINMsigTx`,
          params: {
            txtCode,
            signedTxMsgPack,
            secondaryAccount,
          },
          config,
        },
        { root: true }
      );
    } catch (e) {
      dispatch("toast/openError", e.message, {
        root: true,
      });
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
