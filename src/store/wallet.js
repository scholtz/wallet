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
  lastPayTo: "",
  lastActiveAccount: "",
  lastActiveAccountName: "",
});

const mutations = {
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
    secret.name = name;
    state.privateAccounts.push(secret);
  },
  setPrivateAccount(state, { info }) {
    const acc = state.privateAccounts.find((x) => x.addr == info.address);
    console.log("setPrivateAccount", acc);
    if (acc) {
      for (let index in info) {
        acc[index] = info[index];
      }
      console.log("updated acc ", acc.addr, state.privateAccounts);
    }
  },
  addMultiAccount(state, { addr, params, name }) {
    const multsigaddr = { addr, name, params };
    state.multisigAccounts.push(multsigaddr);
  },
  setPrivateAccounts(state, accts) {
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
  async lastPayTo({ commit, dispatch }, { addr }) {
    commit("lastPayTo", addr);
    await dispatch("saveWallet");
  },
  async lastActiveAccount({ commit, dispatch }, { addr }) {
    commit("lastActiveAccount", addr);
    await dispatch("saveWallet");
  },
  async getSK({ store }, { addr }) {
    console.log("store", store, this.state);
    const address = this.state.wallet.privateAccounts.find(
      (a) => a.addr == addr
    );
    console.log(
      "store",
      store,
      this.state,
      this.state.wallet.privateAccounts,
      address
    );
    if (address) {
      const ret = Uint8Array.from(Object.values(address.sk));
      console.log(
        "ret, address.sk",
        ret,
        address.sk,
        Object.values(address.sk)
      );
      return ret;
    }
  },
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
  async updateAccount({ dispatch, commit }, { info }) {
    console.log("updateAccount", info);
    if (!info) {
      return false;
    }
    await commit("setPrivateAccount", { info });
    await dispatch("saveWallet");
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
    db.version(2).stores({ wallets: "++id,name,addr,data" });
    const walletRecord = await db.wallets.get({ name: this.state.wallet.name });

    if (!walletRecord.id) {
      alert("Error in wallet record update");
    }

    const data = JSON.stringify(this.state.wallet);
    const dataencoded = CryptoJS.AES.encrypt(data, pass);
    walletRecord.data = dataencoded.toString();
    await db.wallets.update(walletRecord.id, walletRecord);
    //console.log("saved", this.state.wallet);
  },
  async openWallet({ commit }, { name, pass }) {
    const db = new Dexie("AWallet");

    db.version(2).stores({ wallets: "++id,name,addr,data" });
    const walletRecord = await db.wallets.get({ name });
    const encryptedData = walletRecord.data;
    try {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, pass);
      const json = JSON.parse(decryptedData.toString(CryptoJS.enc.Utf8));
      await commit("setPrivateAccounts", json.privateAccounts);
      await commit("setPublicAccount", json.publicAccounts);
      await commit("setMultisigAccount", json.multisigAccounts);
      await commit("lastPayTo", json.lastPayTo);
      await commit("lastActiveAccount", json.lastActiveAccount);
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
    db.version(2).stores({ wallets: "++id,name,addr,data" });

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
    db.version(2).stores({ wallets: "++id,name,addr,data" });
    //db.wallets.clear();
    //db.wallets.drop();
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
