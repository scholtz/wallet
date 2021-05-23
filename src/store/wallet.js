import algosdk from "algosdk";
import Dexie from "dexie";
import CryptoJS from "crypto-js";
import cryptoRandomString from "crypto-random-string";

const state = () => ({
  name: "w2",
  isOpen: false,
  time: 2000000000000,
  pass: "U2FsdGVkX1/P98d6R7QllvTWEyp77oEiZ1kkr6NOcNQ=",
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
  logout(state) {
    state.pass = "";
    state.time = 0;
    state.isOpen = false;
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
  async logout({ commit }) {
    await commit("logout");
  },
  async prolong({ commit }) {
    await commit("prolong");
  },
  async addPrivateAccount({ dispatch, commit }, { mn }) {
    try {
      const secret = algosdk.mnemonicToSecretKey(mn);

      await commit("addPrivateAccount", secret);
      await dispatch("saveWallet");
      return true;
    } catch (e) {
      console.log("error", e);
      alert("Account has not been created");
    }
  },
  async saveWallet() {
    const encryptedPass = this.state.wallet.pass;
    const decryptedData = await CryptoJS.AES.decrypt(
      encryptedPass,
      localStorage.getItem("rs1")
    );
    const pass = decryptedData.toString(CryptoJS.enc.Utf8);

    if (!pass) {
      alert("Error in storing wallet");
    }

    if (!this.state.wallet.name) {
      alert("Wallet not found");
    }

    const db = new Dexie("AWallet");
    db.version(1).stores({ wallets: "++id,name,data" });
    const walletRecord = await db.wallets.get({ name: this.state.wallet.name });

    if (!walletRecord.id) {
      alert("Error in wallet record update");
    }

    const data = JSON.stringify(this.state.wallet);
    const dataencoded = CryptoJS.AES.encrypt(data, pass);
    walletRecord.data = dataencoded.toString();
    await db.wallets.update(walletRecord.id, walletRecord);
  },
  async openWallet({ commit }, { name, pass }) {
    const db = new Dexie("AWallet");

    db.version(1).stores({ wallets: "++id,name,data" });
    const walletRecord = await db.wallets.get({ name });
    const encryptedData = walletRecord.data;
    try {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, pass);
      const json = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
      await commit("setPrivateAccount", json.privateAccounts);
      await commit("setPublicAccount", json.publicAccounts);
      await commit("setIsOpen", { name, pass });
    } catch (e) {
      alert("Wrong password");
    }
  },
  async createWallet({ dispatch }, { name, pass }) {
    const db = new Dexie("AWallet");
    db.version(1).stores({ wallets: "++id,name,data" });

    if ((await db.wallets.toArray()).map((v) => v.name).includes(name)) {
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
