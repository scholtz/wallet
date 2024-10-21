import algosdk from "algosdk";
import CryptoJS from "crypto-js";
import cryptoRandomString from "crypto-random-string";
import db from "../shared/db";
import wc from "../shared/wc";
import { safeJsonParse, safeJsonStringify } from "@walletconnect/safe-json";

const state = () => ({
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
const parseEntry = (entry) => {
  return [entry[0], safeJsonParse(entry[1] ?? "")];
};
const mutations = {
  setTransaction(state, transaction) {
    state.transaction = transaction;
  },
  lastPayTo(state, addr) {
    state.lastPayTo = addr;
  },
  lastActiveAccount(state, addr) {
    const current = state.privateAccounts.find((a) => a.addr == addr);
    if (current) {
      state.lastActiveAccount = addr;
      state.lastActiveAccountName = current.name;
    }
  },
  addPrivateAccount(state, { name, secret }) {
    state.lastActiveAccount = secret.addr;
    state.lastActiveAccountName = name;
    secret.name = name;
    state.privateAccounts.push(secret);
  },
  addArc200Asset(state, { addr, arc200Info, network }) {
    const acc = state.privateAccounts.find((x) => x.addr == addr);
    if (!acc.data) acc.data = {};
    if (!acc.data[network]) acc.data[network] = {};
    if (!acc.data[network]["arc200"]) acc.data[network]["arc200"] = {};
    acc.data[network]["arc200"][arc200Info.arc200id] = arc200Info;
  },
  updateArc200Balance(state, { addr, network, arc200Id, balance }) {
    const acc = state.privateAccounts.find((x) => x.addr == addr);
    if (!acc.data) acc.data = {};
    if (!acc.data[network]) acc.data[network] = {};
    if (!acc.data[network]["arc200"]) acc.data[network]["arc200"] = {};
    if (!acc.data[network]["arc200"][arc200Id]) {
      throw Error(`Asset with id ${arc200Id} is not present to the wallet.`);
    }
    acc.data[network]["arc200"][arc200Id].balance = balance;
  },
  addPublicAccount(state, { name, addr }) {
    const acc = { name, addr, address: addr };
    state.privateAccounts.push(acc);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  deleteAccount(state, { name, addr }) {
    const index = state.privateAccounts.findIndex(
      (acc) => acc.name == name && acc.addr == addr
    );
    state.privateAccounts.splice(index, 1);
  },
  setPrivateAccount(state, { info, network }) {
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
    { name, savePassword, email, genAccount, network }
  ) {
    const account = {
      addr: genAccount.addr,
      address: genAccount.addr,
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
    state.lastActiveAccount = genAccount.addr;
    state.lastActiveAccountName = name;
  },
  addMultiAccount(state, { addr, params, name, network }) {
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
    }
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
    }
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
  addLedgerAccount(state, { name, addr, addr0, slot, network }) {
    const account = { name, addr, addr0, slot, network, type: "ledger" };
    state.privateAccounts.push(account);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  addWalletConnectAccount(state, { name, addr, session, network }) {
    const account = { name, addr, session, network, ver: "1", type: "wc" };
    state.privateAccounts.push(account);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  addWalletConnect2Account(state, { name, addr, session, network }) {
    const account = { name, addr, session, network, ver: "2", type: "wc" };
    state.privateAccounts.push(account);
    state.lastActiveAccount = addr;
    state.lastActiveAccountName = name;
  },
  setPrivateAccounts(state, accts) {
    if (accts) {
      state.privateAccounts = accts;
    } else {
      state.privateAccounts = [];
    }
  },
  setWC(state, wc) {
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
  setIsOpen(state, { name, pass }) {
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
    const dataencoded = CryptoJS.AES.encrypt(pass, localStorage.getItem("rs1"));

    state.pass = dataencoded.toString();

    state.time = new Date();
  },
  wcSetItem(state, { key, value }) {
    state.wc[key] = safeJsonStringify(value);
  },
  wcRemoveItem(state, { key }) {
    delete state.wc[key];
  },
};
const actions = {
  async setTransaction({ commit }, { transaction }) {
    commit("setTransaction", transaction);
  },
  async lastPayTo({ commit, dispatch }, { addr }) {
    commit("lastPayTo", addr);
    await dispatch("saveWallet");
  },
  async lastActiveAccount({ commit, dispatch }, { addr }) {
    commit("lastActiveAccount", addr);
    await dispatch("saveWallet");
  },
  async getAccount({ dispatch }, { addr }) {
    return this.state.wallet.privateAccounts.find((a) => a.addr == addr);
  },
  async getSK({ dispatch }, { addr, checkRekey = true }) {
    const address = this.state.wallet.privateAccounts.find(
      (a) => a.addr == addr
    );
    if (address) {
      if (
        address &&
        address.data &&
        address.data[this.state.config.env] &&
        address.data[this.state.config.env].rekeyedTo &&
        address.data[this.state.config.env].rekeyedTo != addr
      ) {
        return await dispatch("getSK", {
          addr: address.data[this.state.config.env].rekeyedTo,
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
  async addArc200Asset({ dispatch, commit }, { addr, arc200Info }) {
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
  async updateArc200Balance({ dispatch, commit }, { addr, arc200Id, balance }) {
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
  async addPrivateAccount({ dispatch, commit }, { mn, name }) {
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
    } catch (e) {
      console.error("error", e);
      dispatch(
        "toast/openError",
        "Account has not been created: " + e.message,
        {
          root: true,
        }
      );
    }
  },
  async addPublicAccount({ dispatch, commit }, { name, addr }) {
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
    } catch (e) {
      console.error("error", e);
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
    }
  },
  async deleteAccount({ dispatch, commit }, { name, addr }) {
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
    } catch (e) {
      console.error("error", e);
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
    }
  },
  async addEmailPasswordAccount(
    { dispatch, commit },
    { name, savePassword, email, password }
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
    } catch (e) {
      console.error("error", e);
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
      throw e;
    }
  },
  async addMultiAccount({ dispatch, commit }, { params, name }) {
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
    } catch (e) {
      console.error("error", e);

      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
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
    } catch (e) {
      console.error("error", e);
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
    }
  },
  async addLedgerAccount({ dispatch, commit }, { name, addr, addr0, slot }) {
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
    } catch (e) {
      console.error("error", e);
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
    }
  },
  async addWalletConnectAccount({ dispatch, commit }, { name, addr, session }) {
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
    } catch (e) {
      console.error("error", e);
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
    }
  },
  async addWalletConnect2Account(
    { dispatch, commit },
    { name, addr, session }
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
    } catch (e) {
      console.error("error", e);
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
    }
  },
  async updateAccount({ dispatch, commit }, { info }) {
    if (!info) {
      return false;
    }
    await commit("setPrivateAccount", { info, network: this.state.config.env });
    await dispatch("saveWallet");
  },
  async changePassword({ dispatch }, { passw1, passw2, passw3 }) {
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

    const walletRecord = await db.wallets.get({ name: this.state.wallet.name });

    const data = JSON.stringify(
      this.state.wallet,
      (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
    );
    const dataencoded = CryptoJS.AES.encrypt(data, passw2);
    walletRecord.data = dataencoded.toString();
    await db.wallets.update(walletRecord.id, walletRecord);
    return true;
  },
  async saveWallet({ dispatch }) {
    const encryptedPass = this.state.wallet.pass;
    const decryptedData = await CryptoJS.AES.decrypt(
      encryptedPass,
      localStorage.getItem("rs1")
    );
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
    const walletRecord = await db.wallets.get({ name: this.state.wallet.name });
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
        await db.wallets.update(walletRecord.id, walletRecord);
      }
    }
  },
  async openWallet({ commit, dispatch }, { name, pass }) {
    const walletRecord = await db.wallets.get({ name });
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
    } catch (e) {
      dispatch("toast/openError", "Wrong password", {
        root: true,
      });
      console.error("wrong password", e);
      return;
    }

    await wc.restore();
    return true;
  },
  async checkPassword({ dispatch }, { pass }) {
    const name = await dispatch("getName");
    const walletRecord = await db.wallets.get({ name });
    const encryptedData = walletRecord.data;
    try {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, pass);
      const json = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
      return !!json;
    } catch (e) {
      return false;
    }
  },
  async createWallet({ dispatch, commit }, { name, pass }) {
    if (!name) {
      dispatch("toast/openError", "Plase set wallet name", {
        root: true,
      });
      return false;
    }
    if ((await db.wallets.toArray()).map((v) => v.name).includes(name)) {
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

    db.wallets
      .add({ name, data: dataencoded.toString() })
      .then(function () {
        return true;
      })
      .catch(function (e) {
        dispatch("toast/openError", "Error: " + (e.stack || e), {
          root: true,
        });
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
    //db.wallets.clear();
    //db.wallets.drop();
    try {
      const w = await db.wallets.toArray();
      return w.map((v) => v.name);
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
      const walletRecord = await db.wallets.get({ name });
      return btoa(walletRecord.data);
    } catch (e) {
      dispatch("toast/openError", "Error occurred: " + e, {
        root: true,
      });
      console.error("error", e);
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
      const walletRecord = await db.wallets.get({ name });
      await db.wallets.delete(walletRecord.id);
      commit("logout");
    }
  },
  async importWallet({ commit, dispatch }, { name, data }) {
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
    const walletRecord = await db.wallets.get({ name });
    if (walletRecord) {
      dispatch("toast/openError", "Wallet with the same name already exists", {
        root: true,
      });
      return;
    }
    await db.wallets.add({ name, data });
    localStorage.setItem("lastUsedWallet", name);
    return true;
  },
  encrypt: async (store, { data }) => {
    const encryptedPass = store.state.pass;
    const decryptedData = await CryptoJS.AES.decrypt(
      encryptedPass,
      localStorage.getItem("rs1")
    );

    const pass = decryptedData.toString(CryptoJS.enc.Utf8);
    const cipher = CryptoJS.AES.encrypt(data, pass).toString();
    return cipher;
  },
  decrypt: async (store, { data }) => {
    const encryptedPass = store.state.pass;
    const decryptedData = await CryptoJS.AES.decrypt(
      encryptedPass,
      localStorage.getItem("rs1")
    );

    const pass = decryptedData.toString(CryptoJS.enc.Utf8);
    const plain = CryptoJS.AES.decrypt(data, pass).toString(CryptoJS.enc.Utf8);
    return plain;
  },
  getName: (store) => {
    return store.state.name;
  },
  async wcGetKeys() {
    return Object.keys(this.state.wallet.wc);
  },
  async wcGetEntries() {
    return Object.entries(this.state.wallet.wc).map(parseEntry);
  },
  async wcGetItem({ dispatch }, { key }) {
    const item = this.state.wallet.wc[key];
    if (!item) {
      return undefined;
    }
    return safeJsonParse(item);
  },
  async wcSetItem({ dispatch, commit }, { key, value }) {
    await commit("wcSetItem", { key, value });
    await dispatch("saveWallet");
  },
  async wcRemoveItem({ dispatch }, { key }) {
    await commit("wcRemoveItem", { key });
    await dispatch("saveWallet");
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
