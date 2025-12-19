import type { ActionContext, ActionTree, MutationTree, Store } from "vuex";
import algosdk, {
  type Account as AlgorandAccount,
  type MultisigMetadata,
} from "algosdk";
import CryptoJS from "crypto-js";
import cryptoRandomString from "crypto-random-string";
import db from "../shared/db";
import wc from "../shared/wc";
import { safeJsonParse, safeJsonStringify } from "@walletconnect/safe-json";
import type { RootState } from "./index";

type WalletAccountData = Record<string, Record<string, any>>;

interface WalletAccount {
  addr?: string;
  name?: string;
  data?: WalletAccountData;
  [key: string]: any;
}

interface WalletRecord {
  id?: number;
  name: string;
  data: string;
}

export interface WalletState {
  name: string;
  isOpen: boolean;
  time: number | Date;
  pass: string;
  privateAccounts: WalletAccount[];
  algodHost: string[];
  lastPayTo: string;
  lastActiveAccount: string;
  lastActiveAccountName: string;
  transaction: Record<string, any>;
  wc: Record<string, string>;
}

type Arc200Info = {
  arc200id: string;
  [key: string]: unknown;
};

type AddPrivateAccountPayload = {
  name: string;
  secret: AlgorandAccount & { name?: string };
  network: string;
};

type AddArc200AssetPayload = {
  addr: string;
  arc200Info: Arc200Info;
  network: string;
};

type UpdateArc200BalancePayload = {
  addr: string;
  network: string;
  arc200Id: string;
  balance: number;
};

type PublicAccountPayload = {
  name: string;
  addr: string;
};

type DeleteAccountPayload = PublicAccountPayload;

type SetPrivateAccountPayload = {
  info: WalletAccount & { address?: string };
  network: string;
};

type AddEmailPasswordAccountPayload = {
  name: string;
  savePassword: boolean;
  email: string;
  genAccount: AlgorandAccount;
  network: string;
};

type AddMultiAccountPayload = {
  addr: string;
  params: MultisigMetadata;
  name: string;
  network: string;
};

type Add2FAAccountPayload = {
  params: MultisigMetadata;
  addr: string;
  name: string;
  primaryAccount: string;
  recoveryAccount: string;
  twoFactorAccount: string;
  network: string;
};

type Add2FAApiAccountPayload = {
  addr: string;
  name: string;
  primaryAccount: string;
  recoveryAccount: string;
  multisigAccount: string;
  network: string;
  twoFactorAuthProvider: string;
};

type AddLedgerAccountPayload = {
  name: string;
  addr: string;
  addr0: string;
  slot: number;
  network: string;
};

type AddWalletConnectAccountPayload = {
  name: string;
  addr: string;
  session: unknown;
  network: string;
};

type SetIsOpenPayload = {
  name: string;
  pass: string;
};

type WalletConnectStorage = Record<string, string>;

const dbAny = db as any;

const state = (): WalletState => ({
  name: "w2",
  isOpen: false,
  time: 2000000000000,
  pass: "U2FsdGVkX1/P98d6R7QllvTWEyp77oEiZ1kkr6NOcNQ=",
  privateAccounts: [],
  algodHost: [],
  lastPayTo: "",
  lastActiveAccount: "",
  lastActiveAccountName: "",
  transaction: {},
  wc: {},
});
const parseEntry = (entry: [string, unknown]) => {
  const serialized = typeof entry[1] === "string" ? entry[1] : "";
  return [entry[0], safeJsonParse(serialized)];
};
const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
const getRequiredLocalStorage = (key: string): string => {
  const value = localStorage.getItem(key);
  if (value === null) {
    throw new Error(`${key} not found in localStorage`);
  }
  return value;
};
const mutations: MutationTree<WalletState> = {
  setTransaction(state, transaction: Record<string, unknown>) {
    state.transaction = transaction;
  },
  lastPayTo(state, addr: string) {
    state.lastPayTo = addr;
  },
  lastActiveAccount(state, addr: string) {
    console.log("lastActiveAccount set to", addr, state.privateAccounts);
    const current = state.privateAccounts.find((a) => a.addr == addr);
    if (current) {
      state.lastActiveAccount = addr;
      state.lastActiveAccountName = current.name ?? "";
    }
  },
  addPrivateAccount(state, { name, secret }: AddPrivateAccountPayload) {
    const addr = String(secret.addr);
    const account: WalletAccount = {
      ...secret,
      addr,
      address: addr,
      name,
    };
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
    state.privateAccounts.push(account);
  },
  addArc200Asset(state, { addr, arc200Info, network }: AddArc200AssetPayload) {
    const acc = state.privateAccounts.find((x) => x.addr == addr);
    if (!acc) {
      console.error(`Account ${addr} not found while adding ARC-200 asset.`);
      return;
    }
    if (!acc.data) acc.data = {};
    if (!acc.data[network]) acc.data[network] = {};
    if (!acc.data[network]["arc200"]) acc.data[network]["arc200"] = {};
    acc.data[network]["arc200"][arc200Info.arc200id] = arc200Info;
  },
  updateArc200Balance(
    state,
    { addr, network, arc200Id, balance }: UpdateArc200BalancePayload
  ) {
    const acc = state.privateAccounts.find((x) => x.addr == addr);
    if (!acc) {
      console.error(
        `Account ${addr} not found while updating ARC-200 balance.`
      );
      return;
    }
    if (!acc.data) acc.data = {};
    if (!acc.data[network]) acc.data[network] = {};
    if (!acc.data[network]["arc200"]) acc.data[network]["arc200"] = {};
    if (!acc.data[network]["arc200"][arc200Id]) {
      throw Error(`Asset with id ${arc200Id} is not present to the wallet.`);
    }
    acc.data[network]["arc200"][arc200Id].balance = balance;
  },
  addPublicAccount(state, { name, addr }: PublicAccountPayload) {
    const acc = { name, addr, address: addr };
    state.privateAccounts.push(acc);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  deleteAccount(state, { name, addr }: DeleteAccountPayload) {
    const index = state.privateAccounts.findIndex(
      (acc) => acc.name == name && acc.addr == addr
    );
    state.privateAccounts.splice(index, 1);
  },
  setPrivateAccount(state, { info, network }: SetPrivateAccountPayload) {
    if (!info.address) {
      if (!info.addr) return;
      info.address = info.addr;
    }
    if (!info.addr) {
      if (!info.address) return;
      info.addr = info.address;
    }
    let acc = state.privateAccounts.find((x) => x.addr == info.address);
    if (!acc) {
      // to change the network we match the account by address and name
      acc = state.privateAccounts.find(
        (x) => x.addr == info.address && x.name == info.name
      );
    }
    if (!acc) {
      // fallback
      acc = state.privateAccounts.find((x) => x.addr == info.address);
    }
    if (!acc || !acc.addr) {
      console.error(`Error storing account. Address ${info.address} not found`);
      return;
    }
    if (acc) {
      for (let index in info) {
        if (!acc.data) acc.data = {};
        if (!acc.data[network]) acc.data[network] = {};
        acc.data[network][index] = info[index];
        if (index == "rekeyedTo" && acc[index] == info.address) {
          // rekeying set to original address
          delete acc[index];
        }
        if (index == "rekeyedTo" && acc.data[network][index] == info.address) {
          // rekeying set to original address
          delete acc[index];
        }
      }
    }
  },
  addEmailPasswordAccount(
    state,
    {
      name,
      savePassword,
      email,
      genAccount,
      network,
    }: AddEmailPasswordAccountPayload
  ) {
    const addr = String(genAccount.addr);
    const account: WalletAccount = {
      addr,
      address: addr,
      savePassword,
      name,
      email,
      network,
      type: "emailPwd",
    };
    if (savePassword) {
      account.sk = genAccount.sk;
    }
    state.privateAccounts.push(account);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  addMultiAccount(
    state,
    { addr, params, name, network }: AddMultiAccountPayload
  ) {
    const multsigaddr = {
      addr,
      address: addr,
      name,
      params,
      network,
      type: "msig",
    };
    state.privateAccounts.push(multsigaddr);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  add2FAAccount(
    state,
    {
      params,
      addr,
      name,
      primaryAccount,
      recoveryAccount,
      twoFactorAccount,
      network,
    }: Add2FAAccountPayload
  ) {
    const multsigaddr = {
      addr,
      address: addr,
      name,
      params,
      type: "2fa",
      primaryAccount,
      recoveryAccount,
      twoFactorAccount,
      network,
    };
    state.privateAccounts.push(multsigaddr);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  add2FAApiAccount(
    state,
    {
      addr,
      name,
      primaryAccount,
      recoveryAccount,
      multisigAccount,
      network,
      twoFactorAuthProvider,
    }: Add2FAApiAccountPayload
  ) {
    const multsigaddr = {
      addr,
      address: addr,
      name: `2FA ${name}`,
      type: "2faApi",
      primaryAccount,
      recoveryAccount,
      multisigAccount,
      network,
      isHidden: true,
      twoFactorAuthProvider,
    };
    state.privateAccounts.push(multsigaddr);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  addLedgerAccount(
    state,
    { name, addr, addr0, slot, network }: AddLedgerAccountPayload
  ) {
    const account = { name, addr, addr0, slot, network, type: "ledger" };
    state.privateAccounts.push(account);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  addWalletConnectAccount(
    state,
    { name, addr, session, network }: AddWalletConnectAccountPayload
  ) {
    const account = { name, addr, session, network, ver: "1", type: "wc" };
    state.privateAccounts.push(account);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  addWalletConnect2Account(
    state,
    { name, addr, session, network }: AddWalletConnectAccountPayload
  ) {
    const account = { name, addr, session, network, ver: "2", type: "wc" };
    state.privateAccounts.push(account);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  setPrivateAccounts(state, accts?: WalletAccount[]) {
    if (accts) {
      for (let acct of accts) {
        if (typeof acct.addr !== "string") {
          // if addr is algorand address object, convert to string
          const pk = (acct.addr as any)?.publicKey;
          if (pk) {
            var buffer = Buffer.from(Object.values(pk));
            const obj = new algosdk.Address(buffer);
            acct.addr = obj.toString();
          }
        }
      }
      state.privateAccounts = accts;
    } else {
      state.privateAccounts = [];
    }
  },
  setWC(state, wc?: WalletConnectStorage) {
    if (wc) {
      state.wc = wc;
    } else {
      state.wc = {};
    }
  },
  logout(state) {
    state.pass = "";
    state.time = 0;
    state.isOpen = false;
    state.privateAccounts = [];
    state.lastActiveAccount = "";
    state.lastActiveAccountName = "";
  },
  prolong(state) {
    state.time = new Date();
  },
  setIsOpen(state, { name, pass }: SetIsOpenPayload) {
    state.isOpen = true;
    state.name = name;
    if (!localStorage.getItem("rs1"))
      localStorage.setItem(
        "rs1",
        cryptoRandomString({ length: 30, type: "alphanumeric" })
      );
    if (!localStorage.getItem("rs2"))
      localStorage.setItem(
        "rs2",
        cryptoRandomString({ length: 30, type: "alphanumeric" })
      );
    const rs1 = getRequiredLocalStorage("rs1");
    const dataencoded = CryptoJS.AES.encrypt(pass, rs1);

    state.pass = dataencoded.toString();

    state.time = new Date();
  },
  wcSetItem(state, { key, value }: { key: string; value: unknown }) {
    state.wc[key] = safeJsonStringify(value);
  },
  wcRemoveItem(state, { key }: { key: string }) {
    delete state.wc[key];
  },
};
type WalletActionContext = ActionContext<WalletState, RootState>;
type WalletActionHandler = (
  this: Store<RootState>,
  context: WalletActionContext,
  payload?: any
) => any;

const actionHandlers: Record<string, WalletActionHandler> = {
  async setTransaction(
    { commit },
    { transaction }: { transaction: Record<string, unknown> }
  ) {
    commit("setTransaction", transaction);
  },
  async lastPayTo({ commit, dispatch }, { addr }: { addr: string }) {
    commit("lastPayTo", addr);
    await dispatch("saveWallet");
  },
  async lastActiveAccount({ commit, dispatch }, { addr }: { addr: string }) {
    console.log("lastActiveAccount action handler called with", addr);
    await commit("lastActiveAccount", addr);
    await dispatch("saveWallet");
  },
  async getAccount({ dispatch }, { addr }: { addr: string }) {
    return this.state.wallet.privateAccounts.find((a) => a.addr == addr);
  },
  async getSK(
    { dispatch },
    { addr, checkRekey = true }: { addr: string; checkRekey?: boolean }
  ) {
    const address = this.state.wallet.privateAccounts.find(
      (a) => a.addr == addr
    );
    if (address) {
      const network = String(this.state.config.env);
      if (
        address &&
        address.data &&
        address.data[network] &&
        address.data[network].rekeyedTo &&
        address.data[network].rekeyedTo != addr
      ) {
        return await dispatch("getSK", {
          addr: address.data[network].rekeyedTo,
          checkRekey: false,
        });
      }
      if (address.sk) {
        const ret = Uint8Array.from(Object.values(address.sk));
        return ret;
      }
    }
  },
  async logout({ commit }) {
    wc.clear();
    await commit("logout");
  },
  async prolong({ commit }) {
    await commit("prolong");
  },
  async addArc200Asset(
    { dispatch, commit },
    { addr, arc200Info }: { addr: string; arc200Info: Arc200Info }
  ) {
    await commit("prolong");
    if (!addr) {
      dispatch("toast/openError", "addr is empty", {
        root: true,
      });
      return false;
    }

    await commit("addArc200Asset", {
      addr,
      arc200Info,
      network: this.state.config.env,
    });
    await dispatch("saveWallet");
    return true;
  },
  async updateArc200Balance(
    { dispatch, commit },
    {
      addr,
      arc200Id,
      balance,
    }: {
      addr: string;
      arc200Id: string;
      balance: number;
    }
  ) {
    if (!addr) {
      dispatch("toast/openError", "addr is empty", {
        root: true,
      });
      return false;
    }
    if (!arc200Id) {
      dispatch("toast/openError", "arc200Id is empty", {
        root: true,
      });
      return false;
    }

    await commit("updateArc200Balance", {
      addr,
      arc200Id,
      network: this.state.config.env,
      balance,
    });
    await dispatch("saveWallet");
    return true;
  },
  async addPrivateAccount(
    { dispatch, commit },
    { mn, name }: { mn: string; name: string }
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      return false;
    }
    try {
      const secret = algosdk.mnemonicToSecretKey(mn);
      await commit("addPrivateAccount", {
        name,
        secret,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async addPublicAccount(
    { dispatch, commit },
    { name, addr }: PublicAccountPayload
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      return false;
    }
    try {
      await commit("addPublicAccount", {
        name,
        addr,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async deleteAccount(
    { dispatch, commit },
    { name, addr }: DeleteAccountPayload
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase define account name", {
        root: true,
      });
      return false;
    }
    if (!addr) {
      dispatch("toast/openError", "Plase define account addr", {
        root: true,
      });
      return false;
    }
    try {
      await commit("deleteAccount", {
        name,
        addr,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async addEmailPasswordAccount(
    { dispatch, commit },
    {
      name,
      savePassword,
      email,
      password,
    }: { name: string; savePassword: boolean; email: string; password: string }
  ) {
    if (!name) {
      throw Error("Plase set account name");
    }
    try {
      const init = `ARC-0076-${email}-${password}-0-PBKDF2-999999`;
      const salt = `ARC-0076-${email}-0-PBKDF2-999999`;
      const iterations = 999999;
      if (!window || !window.crypto || !window.crypto.subtle) {
        throw Error("Crypto API in browser is not available");
      }
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        Buffer.from(init, "utf-8"),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
      );
      const masterBits = await window.crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: Buffer.from(salt, "utf-8"),
          iterations: iterations,
        },
        cryptoKey,
        256
      );
      const uint8 = new Uint8Array(masterBits);
      const mnemonic = algosdk.mnemonicFromSeed(uint8);
      const genAccount = algosdk.mnemonicToSecretKey(mnemonic);
      await await commit("addEmailPasswordAccount", {
        name,
        savePassword,
        email,
        genAccount,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
      throw error;
    }
  },
  async addMultiAccount(
    { dispatch, commit },
    { params, name }: { params: MultisigMetadata; name: string }
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      return false;
    }
    try {
      const multsigaddr = algosdk.multisigAddress(params);

      await commit("addMultiAccount", {
        addr: multsigaddr,
        params,
        name,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);

      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async add2FAAccount(
    { dispatch, commit },
    {
      name,
      primaryAccount,
      recoveryAccount,
      twoFactorAccount,
      twoFactorAuthProvider,
    }: {
      name: string;
      primaryAccount: string;
      recoveryAccount: string;
      twoFactorAccount: string;
      twoFactorAuthProvider: string;
    }
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      return false;
    }
    try {
      const addrs = [primaryAccount, recoveryAccount, twoFactorAccount].sort();
      const params = {
        version: 1,
        threshold: 2,
        addrs,
      };
      const multisigAccount = algosdk.multisigAddress(params);

      await commit("add2FAApiAccount", {
        addr: twoFactorAccount,
        name,
        primaryAccount,
        recoveryAccount,
        multisigAccount,
        twoFactorAuthProvider,
        network: this.state.config.env,
      });

      await commit("add2FAAccount", {
        addr: multisigAccount,
        params,
        name,
        primaryAccount,
        recoveryAccount,
        twoFactorAccount,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async addLedgerAccount(
    { dispatch, commit },
    {
      name,
      addr,
      addr0,
      slot,
    }: { name: string; addr: string; addr0: string; slot: number }
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      return false;
    }
    try {
      await commit("addLedgerAccount", {
        name,
        addr,
        addr0,
        slot,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async addWalletConnectAccount(
    { dispatch, commit },
    { name, addr, session }: { name: string; addr: string; session: unknown }
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      return false;
    }
    try {
      await commit("addWalletConnectAccount", {
        name,
        addr,
        session,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async addWalletConnect2Account(
    { dispatch, commit },
    { name, addr, session }: { name: string; addr: string; session: unknown }
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      return false;
    }
    if (!addr) {
      dispatch("toast/openError", "Address is missing", {
        root: true,
      });
      return false;
    }
    if (!session) {
      dispatch("toast/openError", "Session data is missing", {
        root: true,
      });
      return false;
    }
    try {
      await commit("addWalletConnect2Account", {
        name,
        addr,
        session,
        network: this.state.config.env,
      });
      await dispatch("saveWallet");
      return true;
    } catch (error) {
      console.error("error", error);
      dispatch(
        "toast/openError",
        "Account has not been created: " + toErrorMessage(error),
        {
          root: true,
        }
      );
    }
  },
  async updateAccount(
    { dispatch, commit },
    { info }: { info: WalletAccount & { address?: string } }
  ) {
    if (!info) {
      return false;
    }
    await commit("setPrivateAccount", { info, network: this.state.config.env });
    await dispatch("saveWallet");
  },
  async changePassword(
    { dispatch },
    {
      passw1,
      passw2,
      passw3,
    }: { passw1: string; passw2: string; passw3: string }
  ) {
    if (passw2 != passw3) {
      dispatch("toast/openError", "Passwords does not match", {
        root: true,
      });
      return;
    }
    const name = this.state.wallet.name;
    if (!name) {
      dispatch("toast/openError", "Wallet name not found", {
        root: true,
      });
      return;
    }

    const check = await dispatch("openWallet", { name, pass: passw1 });
    if (!check) {
      dispatch("toast/openError", "Password is incorrect", {
        root: true,
      });
      return;
    }

    const walletRecord = await dbAny.wallets.get({
      name: this.state.wallet.name,
    });

    const data = JSON.stringify(
      this.state.wallet,
      (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
    );
    const dataencoded = CryptoJS.AES.encrypt(data, passw2);
    walletRecord.data = dataencoded.toString();
    await dbAny.wallets.update(walletRecord.id, walletRecord);
    return true;
  },
  async saveWallet({ dispatch }) {
    const encryptedPass = this.state.wallet.pass;
    const rs1 = getRequiredLocalStorage("rs1");
    const decryptedData = await CryptoJS.AES.decrypt(encryptedPass, rs1);
    const pass = decryptedData.toString(CryptoJS.enc.Utf8);

    if (!pass) {
      // password not yet initialized
      return false;
    }

    if (!this.state.wallet.name) {
      dispatch("toast/openError", "Wallet not found", {
        root: true,
      });
      return false;
    }

    if (
      !this.state.wallet.privateAccounts ||
      this.state.wallet.privateAccounts.length == 0
    ) {
      return false; // check not to empty the wallet
    }
    const walletRecord = await dbAny.wallets.get({
      name: this.state.wallet.name,
    });
    if (!walletRecord) return;
    if (!walletRecord || !walletRecord.id) {
      dispatch("toast/openError", "Error in wallet record update", {
        root: true,
      });
      return false;
    }
    if (this.state.wallet) {
      const data = JSON.stringify(
        this.state.wallet,
        (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
      );
      const dataencoded = CryptoJS.AES.encrypt(data, pass);
      if (walletRecord && dataencoded) {
        walletRecord.data = dataencoded.toString();
        await dbAny.wallets.update(walletRecord.id, walletRecord);
      }
    }
  },
  async openWallet(
    { commit, dispatch },
    { name, pass }: { name: string; pass: string }
  ) {
    const walletRecord = await dbAny.wallets.get({ name });
    const encryptedData = walletRecord.data;
    try {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, pass);
      const json = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
      await commit("setPrivateAccounts", json.privateAccounts);
      await commit("lastPayTo", json.lastPayTo);
      await commit("lastActiveAccount", json.lastActiveAccount);
      await commit("setWC", json.wc);
      await commit("setIsOpen", { name, pass });

      localStorage.setItem("lastUsedWallet", name);
    } catch (error) {
      dispatch("toast/openError", "Wrong password", {
        root: true,
      });
      console.error("wrong password", error);
      return;
    }

    await wc.restore();
    return true;
  },
  async checkPassword({ dispatch }, { pass }: { pass: string }) {
    const name = await dispatch("getName");
    const walletRecord = await dbAny.wallets.get({ name });
    const encryptedData = walletRecord.data;
    try {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, pass);
      const json = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
      return !!json;
    } catch (error) {
      return false;
    }
  },
  async createWallet(
    { dispatch, commit },
    { name, pass }: { name: string; pass: string }
  ) {
    if (!name) {
      dispatch("toast/openError", "Plase set wallet name", {
        root: true,
      });
      return false;
    }
    const existingWallets = (await dbAny.wallets.toArray()) as WalletRecord[];
    if (existingWallets.some((wallet) => wallet.name === name)) {
      dispatch("toast/openError", "Wallet with the same name already exists", {
        root: true,
      });
      return false;
    }
    const data = JSON.stringify(
      this.state.wallet,
      (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
    );
    const dataencoded = CryptoJS.AES.encrypt(data, pass);

    dbAny.wallets
      .add({ name, data: dataencoded.toString() })
      .then(function () {
        return true;
      })
      .catch((error: unknown) => {
        const stack = (error as Error).stack;
        dispatch(
          "toast/openError",
          "Error: " + (stack || toErrorMessage(error)),
          {
            root: true,
          }
        );
      });
    await dispatch("saveWallet");
    await commit("setIsOpen", { name, pass });
    return true;
  },
  async getWallets() {
    if (!localStorage.getItem("rs1"))
      localStorage.setItem(
        "rs1",
        cryptoRandomString({ length: 30, type: "alphanumeric" })
      );
    if (!localStorage.getItem("rs2"))
      localStorage.setItem(
        "rs2",
        cryptoRandomString({ length: 30, type: "alphanumeric" })
      );
    //dbAny.wallets.clear();
    //dbAny.wallets.drop();
    try {
      const w = (await dbAny.wallets.toArray()) as WalletRecord[];
      return w.map((wallet) => wallet.name);
    } catch {
      console.error("no wallet exists yet");
      return [];
    }
  },
  async backupWallet({ dispatch }) {
    try {
      const name = this.state.wallet.name;
      if (!name) {
        dispatch("toast/openError", "Wallet name not found", {
          root: true,
        });
        return;
      }
      const walletRecord = (await dbAny.wallets.get({ name })) as
        | WalletRecord
        | undefined;
      if (!walletRecord) {
        dispatch("toast/openError", "Wallet backup not found", {
          root: true,
        });
        return;
      }
      return btoa(walletRecord.data);
    } catch (error) {
      dispatch("toast/openError", "Error occurred: " + toErrorMessage(error), {
        root: true,
      });
      console.error("error", error);
    }
  },
  async destroyWallet({ commit, dispatch }) {
    const name = this.state.wallet.name;
    if (!name) {
      dispatch("toast/openError", "Wallet name not found", {
        root: true,
      });
      return;
    }
    if (
      confirm(
        "Are you sure you want to destroy the wallet with name " +
          name +
          " and all private keys within it?"
      )
    ) {
      const walletRecord = await dbAny.wallets.get({ name });
      await dbAny.wallets.delete(walletRecord.id);
      commit("logout");
    }
  },
  async importWallet(
    { commit, dispatch },
    { name, data }: { name: string; data: string }
  ) {
    if (!name) {
      dispatch("toast/openError", "Wallet name not found", {
        root: true,
      });
      return;
    }
    if (!data) {
      dispatch("toast/openError", "Wallet data not found", {
        root: true,
      });
      return;
    }
    const walletRecord = await dbAny.wallets.get({ name });
    if (walletRecord) {
      dispatch("toast/openError", "Wallet with the same name already exists", {
        root: true,
      });
      return;
    }
    await dbAny.wallets.add({ name, data });
    localStorage.setItem("lastUsedWallet", name);
    return true;
  },
  encrypt: async (store: WalletActionContext, { data }: { data: string }) => {
    const encryptedPass = store.state.pass;
    const rs1 = getRequiredLocalStorage("rs1");
    const decryptedData = await CryptoJS.AES.decrypt(encryptedPass, rs1);

    const pass = decryptedData.toString(CryptoJS.enc.Utf8);
    const cipher = CryptoJS.AES.encrypt(data, pass).toString();
    return cipher;
  },
  decrypt: async (store: WalletActionContext, { data }: { data: string }) => {
    const encryptedPass = store.state.pass;
    const rs1 = getRequiredLocalStorage("rs1");
    const decryptedData = await CryptoJS.AES.decrypt(encryptedPass, rs1);

    const pass = decryptedData.toString(CryptoJS.enc.Utf8);
    const plain = CryptoJS.AES.decrypt(data, pass).toString(CryptoJS.enc.Utf8);
    return plain;
  },
  getName: (store: WalletActionContext) => {
    return store.state.name;
  },
  async wcGetKeys() {
    return Object.keys(this.state.wallet.wc);
  },
  async wcGetEntries() {
    return Object.entries(this.state.wallet.wc).map(parseEntry);
  },
  async wcGetItem({ dispatch }, { key }: { key: string }) {
    const item = this.state.wallet.wc[key];
    if (!item) {
      return undefined;
    }
    return safeJsonParse(item);
  },
  async wcSetItem(
    { dispatch, commit },
    { key, value }: { key: string; value: unknown }
  ) {
    await commit("wcSetItem", { key, value });
    await dispatch("saveWallet");
  },
  async wcRemoveItem({ dispatch, commit }, { key }: { key: string }) {
    await commit("wcRemoveItem", { key });
    await dispatch("saveWallet");
  },
};

const actions = actionHandlers as ActionTree<WalletState, RootState>;

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
