<template>
  <div
    class="auth-screen relative flex flex-column align-items-center justify-content-center h-full m-2"
  >
    <Panel class="auth-panel">
      <template #header>
        {{ $t("login.new_wallet") }}
      </template>
      <form autocomplete="off" @submit="createWalletClick">
        <div class="field grid">
          <label for="newwallet-name" class="col-12 mb-1">
            {{ $t("login.new_wallet_name") }}
          </label>
          <div class="col-12">
            <InputText
              id="newwallet-name"
              v-model="newname"
              class="w-full"
              autocomplete="off"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="newwallet-pass" class="col-12 mb-1">
            {{ $t("login.new_wallet_pass") }}
          </label>
          <div class="col-12">
            <Password
              inputId="newwallet-pass"
              v-model="pass"
              type="password"
              class="w-full"
              inputClass="w-full"
              autocomplete="new-password"
              :feedback="false"
            />
          </div>
        </div>
        <div class="field grid">
          <div class="col-12">
            <Button type="submit" id="new_wallet_button_create" class="w-full">
              {{ $t("login.new_wallet_button_create") }}
            </Button>
            <p class="my-2 auth-help">
              {{ $t("login.new_wallet_help1") }}
            </p>
            <p class="my-2 auth-help">
              {{ $t("login.new_wallet_help2") }}
            </p>
          </div>
        </div>
      </form>
    </Panel>
    <div class="language-footer">
      <a
        v-for="lang in $store.state.config.languages"
        :key="lang"
        role="button"
        @click="setLanguage(lang)"
      >
        <Button size="small" severity="secondary" link class="m-1">
          <LanguageFlag :locale="lang" size="1.25rem" />
        </Button>
      </a>
      <a
        href="https://github.com/scholtz/wallet/wiki/I-want-to-help-to-translate"
        target="_blank"
        role="button"
      >
        <Button size="small" severity="secondary" link class="m-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            class="bi bi-plus-circle"
            viewBox="0 0 16 16"
          >
            <path
              d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
            />
            <path
              d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"
            />
          </svg>
        </Button>
      </a>
    </div>
  </div>
</template>
<script>
import { mapActions } from "vuex";

export default {
  data() {
    return {
      newname: "",
      newWalletForm: false,
      pass: "",
      wallet: "",
      wallets: [{ label: "a", code: "a" }],
    };
  },
  async mounted() {
    this.wallets = (await this.getWallets())?.map((w) => ({
      name: w,
      code: w,
    }));
    this.wallet = localStorage.getItem("lastUsedWallet");

    this.newWalletForm = this.wallets.length == 0;
  },
  methods: {
    ...mapActions({
      getWallets: "wallet/getWallets",
      createWallet: "wallet/createWallet",
      openWallet: "wallet/openWallet",
      addHdWalletAccount: "wallet/addHdWalletAccount",
    }),
    async auth(e) {
      e.preventDefault();
      localStorage.setItem("lastUsedWallet", this.wallet);
      await this.openWallet({ name: this.wallet, pass: this.pass });
      if (this.$store.state.config.noredirect) return;
      if (
        this.$store.state.wallet.lastActiveAccount &&
        this.$store.state.wallet.lastActiveAccountName
      ) {
        const redirectTo =
          "/account/" + this.$store.state.wallet.lastActiveAccount;
        this.$router.push(redirectTo);
      } else {
        this.$router.push("/accounts");
      }
    },
    async createWalletClick(e) {
      try {
        e.preventDefault();
        const created = await this.createWallet({
          name: this.newname,
          pass: this.pass,
        });
        if (created) {
          const addr = await this.addHdWalletAccount({
            name: this.$t("hdaccount.default_account_name"),
          });
          if (addr) {
            this.$router.push("/account/" + addr);
          } else {
            this.$router.push("/accounts");
          }
        }
      } catch (e) {
        console.error(e);
      }
    },
    setLanguage(lang) {
      this.$i18n.locale = lang;
      localStorage.setItem("lang", this.$i18n.locale);
    },
  },
};
</script>
