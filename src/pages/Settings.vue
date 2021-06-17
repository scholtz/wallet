<template>
  <main-layout>
    <h1>{{ $t("settings.title") }}</h1>
    <h2>{{ $t("settings.server") }}</h2>
    <label for="env">{{ $t("settings.environment") }}</label>
    <select id="env" v-model="env" class="form-control">
      <option value="mainnet">{{ $t("settings.mainnet") }}</option>
      <option value="testnet">{{ $t("settings.testnet") }}</option>
      <option value="sandbox">{{ $t("settings.sandbox") }}</option>
    </select>
    <p>AlgoD {{ $t("settings.host") }}: {{ $store.state.config.algod }}</p>
    <p>
      AlgoD {{ $t("settings.token") }}: {{ $store.state.config.algodToken }}
    </p>
    <p>KMD {{ $t("settings.host") }}: {{ $store.state.config.kmd }}</p>
    <p>KMD {{ $t("settings.token") }}: {{ $store.state.config.kmdToken }}</p>
    <p>Indexer {{ $t("settings.host") }}: {{ $store.state.config.indexer }}</p>
    <p>
      Indexer {{ $t("settings.token") }}: {{ $store.state.config.indexerToken }}
    </p>
    <h2>{{ $t("settings.language") }}</h2>

    <Dropdown
      v-model="$i18n.locale"
      :options="$store.state.config.languages"
      @change="languageUpdated"
      style="min-width: 100px"
    >
      <template #value="slotProps">
        <div v-if="slotProps.value" class="border-dark">
          <img
            :alt="slotProps.value"
            class="border-dark"
            :src="'/flags/3x2/' + slotProps.value + '.svg'"
            height="15"
          />
          <span class="m-1">{{ slotProps.value }}</span>
        </div>
        <span v-else>
          {{ slotProps.placeholder }}
        </span>
      </template>
      <template #option="slotProps">
        <div class="border-dark">
          <img
            :alt="slotProps.option"
            :src="'/flags/3x2/' + slotProps.option + '.svg'"
            height="15"
          />
          <span class="m-1">{{ slotProps.option }}</span>
        </div>
      </template>
    </Dropdown>
    <h2>{{ $t("settings.pass") }}</h2>
    <form @submit="changePasswordClick">
      <label>{{ $t("settings.oldpass") }}</label>
      <input type="password" class="form-control my-2" v-model="passw1" />
      <label
        >{{ $t("settings.newpass") }}
        <span v-if="strength" :class="strengthClass">{{
          strength
        }}</span></label
      >
      <input type="password" class="form-control my-2" v-model="passw2" />
      <label>{{ $t("settings.repeatpass") }}</label>
      <input type="password" class="form-control my-2" v-model="passw3" />
      <input type="submit" class="btn btn-light my-2" value="Update password" />
    </form>
    <h2>{{ $t("settings.backup") }}</h2>
    <p>{{ $t("settings.backup_help") }}</p>
    <p>
      <a v-if="!b64wallet" @click="makeBackupDataClick" class="btn btn-light">
        {{ $t("settings.create_backup") }}
      </a>
      <a
        v-if="b64wallet"
        :href="'data:image/png;base64,' + b64wallet"
        :download="downloadableWalletName"
        target="_blank"
        class="btn btn-primary"
      >
        {{ $t("settings.download") }}
      </a>
      <a
        v-if="b64wallet"
        @click="destroyWalletClick"
        class="btn btn-danger mx-2"
      >
        {{ $t("settings.delete") }}
      </a>
    </p></main-layout
  >
</template>

<script>
import { mapActions } from "vuex";
import MainLayout from "../layouts/Main.vue";
import { passwordStrength } from "check-password-strength";

export default {
  data() {
    return {
      env: "mainnet",
      passw1: "",
      passw2: "",
      passw3: "",
      b64wallet: "",
    };
  },
  watch: {
    env() {
      console.log("this.env", this.env);
      if (this.env == "mainnet") {
        this.setHosts({
          algod: "https://algoexplorerapi.io",
          kmd: "?",
          indexer: "https://algoexplorerapi.io/idx2",
        });
      }
      if (this.env == "testnet") {
        this.setHosts({
          algod: "https://testnet.algoexplorerapi.io",
          kmd: "?",
          indexer: "https://testnet.algoexplorerapi.io/idx2",
        });
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
      localStorage.setItem("env", this.env);
    },
  },
  computed: {
    downloadableWalletName() {
      return (
        this.$store.state.wallet.name.replace(" ", "") +
        ".algow." +
        new Date().toISOString().slice(0, 10) +
        ".dat"
      );
    },
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
      return this.$t("strength") + ": " + ret.value;
    },
  },
  components: {
    MainLayout,
  },
  mounted() {
    const newEnv = localStorage.getItem("env");
    if (newEnv) {
      this.env = newEnv;
    }
  },
  methods: {
    ...mapActions({
      setHosts: "config/setHosts",
      changePassword: "wallet/changePassword",
      backupWallet: "wallet/backupWallet",
      destroyWallet: "wallet/destroyWallet",
    }),
    changePasswordClick(e) {
      e.preventDefault();
      const result = this.changePassword({
        passw1: this.passw1,
        passw2: this.passw2,
        passw3: this.passw3,
      });
      if (result) {
        alert(this.$t("settings.updated_password"));
      }
    },
    async makeBackupDataClick() {
      this.b64wallet = await this.backupWallet();
    },
    async destroyWalletClick() {
      await this.destroyWallet();
    },
    languageUpdated() {
      localStorage.setItem("lang", this.$i18n.locale);
    },
  },
};
</script>
