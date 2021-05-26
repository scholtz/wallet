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
  multisigAccounts: [],
  publicAccounts: [],
  algodHost: [],
});

const mutations = {
  addPrivateAccount(state, { name, secret }) {
    secret.name = name;
    state.privateAccounts.push(secret);
  },
  addMultiAccount(state, { addr, params, name }) {
    const multsigaddr = { addr, name, params };
    state.multisigAccounts.push(multsigaddr);
  },
  setPrivateAccount(state, accts) {
    if (accts) {
      state.privateAccounts = accts;
    } else {
      state.privateAccounts = [];
    }
  },
  setPublicAccount(state, accts) {
    if (accts) {
      state.publicAccounts = accts;
    } else {
      state.publicAccounts = [];
    }
  },
  setMultisigAccount(state, accts) {
    if (accts) {
      state.multisigAccounts = accts;
    } else {
      state.multisigAccounts = [];
    }
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
  async addPrivateAccount({ dispatch, commit }, { mn, name }) {
    if (!name) {
      alert("Plase set account name");
      return false;
    }
    try {
      const secret = algosdk.mnemonicToSecretKey(mn);

      await commit("addPrivateAccount", { name, secret });
      await dispatch("saveWallet");
      return true;
    } catch (e) {
      console.log("error", e);
      alert("Account has not been created");
    }
  },
  async addMultiAccount({ dispatch, commit }, { params, name }) {
    if (!name) {
      alert("Plase set account name");
      return false;
    }
    try {
      const multsigaddr = algosdk.multisigAddress(params);

      await commit("addMultiAccount", { addr: multsigaddr, params, name });
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
    console.log("saved");
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
      await commit("setMultisigAccount", json.multisigAccounts);
      await commit("setIsOpen", { name, pass });
    } catch (e) {
      alert("Wrong password");
    }
  },
  async createWallet({ dispatch, commit }, { name, pass }) {
    if (!name) {
      alert("Plase set wallet name");
      return false;
    }
    const db = new Dexie("AWallet");
    db.version(1).stores({ wallets: "++id,name,data" });

    if ((await db.wallets.toArray()).map((v) => v.name).includes(name)) {
      alert("Wallet with the same name already exists");
      return false;
    }
    console.log("a");
    const data = JSON.stringify(this.state.wallet);
    const dataencoded = CryptoJS.AES.encrypt(data, pass);

    db.wallets
      .add({ name, data: dataencoded.toString() })
      .then(function() {
        console.log("ok");
        return true;
      })
      .catch(function(e) {
        alert("Error: " + (e.stack || e));
      });
    console.log("saving");
    await dispatch("saveWallet");
    await commit("setIsOpen", { name, pass });
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
