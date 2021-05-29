<template>
  <div class="d-flex align-items-center justify-content-center h-100">
    <div class="card w-25" v-if="newWalletForm">
      <div class="card-header">New wallet</div>
      <div class="card-body">
        <form @submit="createWalletClick">
          <label for="newwallet-name">Wallet name</label>
          <input
            v-model="newname"
            id="newwallet-name"
            class="form-control my-2"
          />
          <label for="newwallet-pass"
            >Wallet password
            <span v-if="strength" :class="strengthClass">{{
              strength
            }}</span></label
          >
          <input
            v-model="pass"
            id="newwallet-pass"
            type="password"
            class="form-control my-2"
          />
          <input type="submit" class="btn btn-primary" value="Create wallet" />
          <button
            class="btn btn-light mx-2"
            @click="this.newWalletForm = false"
            v-if="this.wallets.length > 0"
          >
            Go back
          </button>
          <p class="my-2">
            Your wallet will be stored in your browser. Wallet password is
            required to open wallet and see the accounts within the wallet and
            for signing transactions.
          </p>
          <p class="my-2">
            We recommend setting password of length more then 12 characters,
            using lower case letter, uppercase letter, number and special
            character.
          </p>
        </form>
      </div>
    </div>
    <div class="card w-25" v-if="!newWalletForm">
      <div class="card-header">Open wallet</div>
      <div class="card-body">
        <form @submit="auth">
          <label for="wallet-select">Select wallet</label>
          <select class="form-control my-2" id="wallet-select" v-model="wallet">
            <option v-for="option in wallets" :key="option">
              {{ option }}
            </option>
          </select>
          <label for="wallet-pass">Wallet password</label>
          <input
            v-model="pass"
            type="password"
            id="wallet-pass"
            class="form-control my-2"
          />
          <input type="submit" class="btn btn-primary" value="Open wallet" />
          <button
            class="btn btn-light mx-2"
            @click="
              newWalletForm = true;
              newname = '';
              pass = '';
            "
          >
            New wallet
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
      return "Strength: " + ret.value;
    },
  },
  async mounted() {
    this.wallets = await this.getWallets();
    this.wallet = localStorage.getItem("lastUsedWallet");

    this.newWalletForm = this.wallets.length == 0;
    console.log("wallets", this.wallets, this.wallets.length);
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