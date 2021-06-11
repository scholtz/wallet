<template>
  <div class="d-flex align-items-center justify-content-center h-100 m-2">
    <div class="card col-12 col-md-6 col-lg-4" v-if="newWalletForm">
      <div class="card-header">{{ $t("login.new_wallet") }}</div>
      <div class="card-body">
        <form @submit="createWalletClick" autocomplete="off">
          <label for="newwallet-name">{{ $t("login.new_wallet_name") }}</label>
          <input
            v-model="newname"
            id="newwallet-name"
            class="form-control my-2"
            autocomplete="off"
          />
          <label for="newwallet-pass"
            >{{ $t("login.new_wallet_pass") }}
            <span v-if="strength" :class="strengthClass">{{
              strength
            }}</span></label
          >
          <input
            v-model="pass"
            id="newwallet-pass"
            type="password"
            class="form-control my-2"
            autocomplete="off"
          />
          <input
            type="submit"
            class="btn btn-primary"
            :value="$t('login.new_wallet_button_create')"
          />
          <router-link to="/import-wallet" class="btn btn-light mx-2">{{
            $t("login.new_wallet_button_import")
          }}</router-link>
          <button
            class="btn btn-light mx-2"
            @click="this.newWalletForm = false"
            v-if="this.wallets.length > 0"
          >
            {{ $t("global.go_back") }}
          </button>
          <p class="my-2">
            {{ $t("login.new_wallet_help1") }}
          </p>
          <p class="my-2">
            {{ $t("login.new_wallet_help2") }}
          </p>
        </form>
      </div>
    </div>
    <div class="card col-12 col-md-6 col-lg-4" v-if="!newWalletForm">
      <div class="card-header">{{ $t("login.open_wallet") }}</div>
      <div class="card-body">
        <form @submit="auth">
          <label for="wallet-select">{{ $t("login.select_wallet") }}</label>
          <select class="form-control my-2" id="wallet-select" v-model="wallet">
            <option v-for="option in wallets" :key="option">
              {{ option }}
            </option>
          </select>
          <label for="wallet-pass">{{ $t("login.wallet_password") }}</label>
          <input
            v-model="pass"
            type="password"
            id="wallet-pass"
            class="form-control my-2"
          />
          <input
            type="submit"
            class="btn btn-primary"
            :value="$t('login.new_wallet_button_open')"
          />
          <button
            class="btn btn-light mx-2"
            @click="
              newWalletForm = true;
              newname = '';
              pass = '';
            "
          >
            {{ $t("login.new_wallet") }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
<script>
import { mapActions } from "vuex";
import { passwordStrength } from "check-password-strength";

export default {
  data() {
    return {
      newname: "",
      newWalletForm: false,
      pass: "",
      wallet: "",
      wallets: [],
    };
  },
  computed: {
    strengthClass() {
      if (!this.pass) return "";
      const ret = passwordStrength(this.pass);
      if (ret.id <= 0) return "badge bg-danger";
      if (ret.id <= 1) return "badge bg-warning text-dark";
      return "badge bg-success";
    },
    strength() {
      if (!this.pass) return "";
      const ret = passwordStrength(this.pass);
      console.log("ret", ret);
      return this.$t("login.strength") + ": " + ret.value;
    },
  },
  async mounted() {
    this.wallets = await this.getWallets();
    this.wallet = localStorage.getItem("lastUsedWallet");

    this.newWalletForm = this.wallets.length == 0;
  },
  methods: {
    ...mapActions({
      getWallets: "wallet/getWallets",
      createWallet: "wallet/createWallet",
      openWallet: "wallet/openWallet",
    }),
    async auth(e) {
      e.preventDefault();
      localStorage.setItem("lastUsedWallet", this.wallet);
      await this.openWallet({ name: this.wallet, pass: this.pass });
      if (
        this.$store.state.wallet.lastActiveAccount &&
        this.$store.state.wallet.lastActiveAccountName
      ) {
        const redirectTo =
          "/account/" + this.$store.state.wallet.lastActiveAccount;
        this.$router.push(redirectTo);
        console.log("to", redirectTo);
      } else {
        this.$router.push("/accounts");
      }
    },
    async createWalletClick(e) {
      e.preventDefault();
      const created = await this.createWallet({
        name: this.newname,
        pass: this.pass,
      });
      if (created) {
        if (
          this.$store.state.wallet.lastActiveAccount &&
          this.$store.state.wallet.lastActiveAccountName
        ) {
          this.$router.push(
            "/account/" + this.$store.state.wallet.lastActiveAccount
          );
        } else {
          this.$router.push("/accounts");
        }
      }
    },
  },
};
</script>