<template>
  <main-layout>
    <h1>Settings</h1>
    <h2>Server</h2>
    <label for="env">Environment</label>
    <select id="env" v-model="env" class="form-control">
      <option value="mainnet">Mainnet</option>
      <option value="testnet">Testnet</option>
      <option value="sandbox">Sandbox</option>
    </select>
    <p>AlgoD host: {{ $store.state.config.algod }}</p>
    <p>AlgoD Token: {{ $store.state.config.algodToken }}</p>
    <p>KMD host: {{ $store.state.config.kmd }}</p>
    <p>KMD Token: {{ $store.state.config.kmdToken }}</p>
    <p>Indexer host: {{ $store.state.config.indexer }}</p>
    <p>Indexer Token: {{ $store.state.config.indexerToken }}</p>
    <h2>Wallet password</h2>
    <form @submit="changePasswordClick">
      <label>Old password</label>
      <input type="password" class="form-control my-2" v-model="passw1" />
      <label
        >New password
        <span v-if="strength" :class="strengthClass">{{
          strength
        }}</span></label
      >
      <input type="password" class="form-control my-2" v-model="passw2" />
      <label>New password - repeat</label>
      <input type="password" class="form-control my-2" v-model="passw3" />
      <input type="submit" class="btn btn-light my-2" value="Update password" />
    </form>
  </main-layout>
</template>

<script>
import { mapActions } from "vuex";
import MainLayout from "../layouts/Main.vue";
import { passwordStrength } from "check-password-strength";

export default {
  data() {
    return {
      env: "sandbox",
      passw1: "",
      passw2: "",
      passw3: "",
    };
  },
  watch: {
    env() {
      console.log("this.env", this.env);
      if (this.env == "mainnet") {
        this.setHosts({ algod: "?", kmd: "?", indexer: "?" });
      }
      if (this.env == "testnet") {
        this.setHosts({ algod: "?", kmd: "?", indexer: "?" });
      }
      if (this.env == "sandbox") {
        this.setHosts({
          algod: "http://localhost:4001",
          kmd: "http://localhost:4002",
          indexer: "http://localhost:8980",
          algodToken:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          kmdToken:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          indexerToken:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        });
      }
    },
  },
  computed: {
    strengthClass() {
      if (!this.passw2) return "";
      const ret = passwordStrength(this.passw2);
      if (ret.id <= 0) return "badge bg-danger";
      if (ret.id <= 1) return "badge bg-warning text-dark";
      return "badge bg-success";
    },
    strength() {
      if (!this.passw2) return "";
      const ret = passwordStrength(this.passw2);
      console.log("ret", ret);
      return "Strength: " + ret.value;
    },
  },
  components: {
    MainLayout,
  },
  mounted() {},
  methods: {
    ...mapActions({
      setHosts: "config/setHosts",
      changePassword: "wallet/changePassword",
    }),
    changePasswordClick(e) {
      e.preventDefault();
      const result = this.changePassword({
        passw1: this.passw1,
        passw2: this.passw2,
        passw3: this.passw3,
      });
      if (result) {
        alert("Password has been updated");
      }
    },
  },
};
</script>