<template>
  <main-layout>
    <h1>Settings</h1>

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
  </main-layout>
</template>

<script>
import { mapActions } from "vuex";
import MainLayout from "../layouts/Main.vue";
export default {
  data() {
    return {
      env: "sandbox",
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
  components: {
    MainLayout,
  },
  mounted() {},
  methods: {
    ...mapActions({
      setHosts: "config/setHosts",
    }),
  },
};
</script>