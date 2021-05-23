import algosdk from "algosdk";
import Dexie from "dexie";
import CryptoJS from "crypto-js";
import cryptoRandomString from "crypto-random-string";

const state = () => ({
  isOpen: false,
  pass: "",
  privateAccounts: [],
  publicAccounts: [],
});

const mutations = {
  addPrivateAccount(state, mn) {
    state.privateAccounts.push(mn);
  },
  setPrivateAccount(state, accts) {
    state.privateAccounts = accts;
  },
  setPublicAccount(state, accts) {
    state.publicAccounts = accts;
  },
  setIsOpen(state, isOpen) {
    state.isOpen = true;
    state.pass = isOpen;
  },
};
const actions = {
  async addPrivateAccount({ dispatch, commit }, { mn }) {
    const secret = algosdk.mnemonicToSecretKey(mn);
    await commit("addPrivateAccount", secret);
    await dispatch("saveWallet");
  },
  async saveWallet() {
    console.log("saved ", this.state);
  },
  async openWallet({ commit, dispatch }, { name, pass }) {
    const db = new Dexie("AWallet");

    db.version(1).stores({ wallets: "++id,name,data" });
    const walletRecord = await db.wallets.get({ name });
    const encryptedData = walletRecord.data;
    try {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, pass);
      const json = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
      await commit("setPrivateAccount", json.privateAccounts);
      await commit("setPublicAccount", json.publicAccounts);
      await commit("setIsOpen", pass);
      await dispatch("saveWallet");
    } catch (e) {
      alert("Wrong password");
    }
  },
  async createWallet({ dispatch }, { name, pass }) {
    const db = new Dexie("AWallet");
    db.version(1).stores({ wallets: "++id,name,data" });

    if ((await db.wallets.toArray()).map((v) => v.name).includes(name)) {
      console.log("exists");
      alert("Wallet with the same name already exists");
      return false;
    }

    const data = JSON.stringify(this.state.wallet);
    const dataencoded = CryptoJS.AES.encrypt(data, pass);

    db.wallets
      .add({ name, data: dataencoded.toString() })
      .then(function() {
        return true;
      })
      .then(function(wallets) {
        console.log("My young friends: ", wallets, db.wallets);
      })
      .catch(function(e) {
        alert("Error: " + (e.stack || e));
      });
    await dispatch("saveWallet");
  },
  async getWallets() {
    const db = new Dexie("AWallet");
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
    db.version(1).stores({ wallets: "++id,name,data" });
    //db.wallets.clear();
    try {
      const w = await db.wallets.toArray();
      return w.map((v) => v.name);
    } catch {
      console.log("no wallet exists yet");
      return [];
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
