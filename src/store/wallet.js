import algosdk from "algosdk";
import CryptoJS from "crypto-js";
import cryptoRandomString from "crypto-random-string";
import db from "../shared/db";
import wc from "../shared/wc";
var pbkdf2 = require("pbkdf2");

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
});

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
  addPrivateAccount(state, { name, secret, network }) {
    secret.name = name;
    secret.network = network;
    state.privateAccounts.push(secret);
  },
  addPublicAccount(state, { name, addr }) {
    const acc = { name, addr, address: addr, network: state.config.env };
    state.privateAccounts.push(acc);
  },
  deleteAccount(state, { name, addr, network }) {
    const index = state.privateAccounts.findIndex(
      (acc) =>
        acc.name == name &&
        acc.addr == addr &&
        (acc.network === undefined || acc.network === network)
    );
    //console.log("deleting", index);
    state.privateAccounts.splice(index, 1);
  },
  setPrivateAccount(state, { info }) {
    console.log("state.privateAccounts", state.privateAccounts);
    console.log("setPrivateAccount.mutation", info);
    if (!info.address) {
      if (!info.addr) return;
      info.address = info.addr;
    }
    if (!info.addr) {
      if (!info.address) return;
      info.addr = info.address;
    }
    let acc = state.privateAccounts.find(
      (x) =>
        x.addr == info.address &&
        (x.network === undefined || x.network === info.network)
    );
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
    console.log("acc", acc, state.privateAccounts);
    if (!acc || !acc.addr)
      throw `Error storing account. Address ${info.address} not found`;
    if (acc) {
      for (let index in info) {
        acc[index] = info[index];
        if (index == "rekeyedTo" && acc[index] == info.address) {
          // rekeying set to original address
          delete acc[index];
        }
      }
    }
    console.log("setPrivateAccount", info, acc);
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
    console.log("new account", account);
    state.privateAccounts.push(account);
  },
  addMultiAccount(state, { addr, params, name, network }) {
    const multsigaddr = {
      addr,
      address: addr,
      name,
      email,
      params,
      network,
      type: "msig",
    };
    state.privateAccounts.push(multsigaddr);
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
  },
  addLedgerAccount(state, { name, addr, addr0, slot, network }) {
    const account = { name, addr, addr0, slot, network, type: "ledger" };
    state.privateAccounts.push(account);
  },
  addWalletConnectAccount(state, { name, addr, session, network }) {
    const account = { name, addr, session, network, type: "wc" };
    state.privateAccounts.push(account);
  },
  setPrivateAccounts(state, accts) {
    if (accts) {
      state.privateAccounts = accts;
    } else {
      state.privateAccounts = [];
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
  async getSK({ dispatch }, { addr }) {
    const address = this.state.wallet.privateAccounts.find(
      (a) => a.addr == addr
    );
    //console.log("privateAccounts", address);
    if (address) {
      //console.log("address", address);
      if (address.rekeyedTo && address.rekeyedTo != addr) {
        return await dispatch("getSK", { addr: address.rekeyedTo });
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
  async addPrivateAccount({ dispatch, commit }, { mn, name }) {
    if (!name) {
      dispatch("toast/openError", "Plase set account name", {
        root: true,
      });
      alert("Plase set account name");
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
      dispatch("toast/openError", "Account has not been created", {
        root: true,
      });
    }
  },
  async addPublicAccount({ dispatch, commit }, { name, addr }) {
    if (!name) {
      alert("Plase set account name");
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
      alert("Plase define account name");
      return false;
    }
    if (!addr) {
      alert("Plase define account addr");
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
      console.log("masterBits", masterBits);
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
      alert("Plase set account name");
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
      alert("Plase set account name");
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
      alert("Plase set account name");
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
      alert("Plase set account name");
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
  async updateAccount({ dispatch, commit }, { info }) {
    console.log("updateAccount", info);
    if (!info) {
      return false;
    }
    await commit("setPrivateAccount", { info });
    await dispatch("saveWallet");
  },
  async changePassword({ dispatch }, { passw1, passw2, passw3 }) {
    if (passw2 != passw3) {
      alert("Passwords does not match");
      return;
    }
    const name = this.state.wallet.name;
    if (!name) {
      alert("Wallet name not found");
      return;
    }

    const check = await dispatch("openWallet", { name, pass: passw1 });
    if (!check) {
      alert("Password is incorrect");
      return;
    }

    const walletRecord = await db.wallets.get({ name: this.state.wallet.name });

    const data = JSON.stringify(this.state.wallet);
    const dataencoded = CryptoJS.AES.encrypt(data, passw2);
    walletRecord.data = dataencoded.toString();
    await db.wallets.update(walletRecord.id, walletRecord);
    return true;
  },
  async saveWallet() {
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
      alert("Wallet not found");
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
      alert("Error in wallet record update");
    }

    const data = JSON.stringify(this.state.wallet);
    const dataencoded = CryptoJS.AES.encrypt(data, pass);
    if (walletRecord && dataencoded) {
      walletRecord.data = dataencoded.toString();
      await db.wallets.update(walletRecord.id, walletRecord);
    }
    //console.log("saved", this.state.wallet);
  },
  async openWallet({ commit }, { name, pass }) {
    const walletRecord = await db.wallets.get({ name });
    const encryptedData = walletRecord.data;
    try {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, pass);
      const json = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
      await commit("setPrivateAccounts", json.privateAccounts);
      await commit("lastPayTo", json.lastPayTo);
      await commit("lastActiveAccount", json.lastActiveAccount);
      await commit("setIsOpen", { name, pass });
    } catch (e) {
      alert("Wrong password");
      console.error("wrong password", e);
      return;
    }

    await wc.restore();
    return true;
  },
  async createWallet({ dispatch, commit }, { name, pass }) {
    if (!name) {
      alert("Plase set wallet name");
      return false;
    }
    if ((await db.wallets.toArray()).map((v) => v.name).includes(name)) {
      alert("Wallet with the same name already exists");
      return false;
    }
    const data = JSON.stringify(this.state.wallet);
    const dataencoded = CryptoJS.AES.encrypt(data, pass);

    db.wallets
      .add({ name, data: dataencoded.toString() })
      .then(function () {
        return true;
      })
      .catch(function (e) {
        alert("Error: " + (e.stack || e));
      });
    await dispatch("saveWallet");
    await commit("setIsOpen", { name, pass });
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
  async backupWallet() {
    try {
      const name = this.state.wallet.name;
      if (!name) {
        alert("Wallet name not found");
        return;
      }
      const walletRecord = await db.wallets.get({ name });
      //console.log("walletRecord.data", walletRecord.data);
      return btoa(walletRecord.data);
    } catch (e) {
      alert("Error occurred: " + e);
      console.log("error", e);
    }
  },
  async destroyWallet({ commit }) {
    const name = this.state.wallet.name;
    if (!name) {
      alert("Wallet name not found");
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
  async importWallet({ commit }, { name, data }) {
    if (!name) {
      alert("Wallet name not found");
      return;
    }
    if (!data) {
      alert("Wallet data not found");
      return;
    }
    const walletRecord = await db.wallets.get({ name });
    if (walletRecord) {
      alert("Wallet with the same name already exists");
      return;
    }
    await db.wallets.add({ name, data });
    localStorage.setItem("lastUsedWallet", name);
    console.log("ok", commit);
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
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
