<template>
  <div
    class="flex flex-column align-items-center justify-content-center h-full m-2"
  >
    <Panel v-if="newWalletForm" class="col-12 md:col-8 lg:col-6">
      <template #header>
        {{ $t("login.new_wallet") }}
      </template>
      <form autocomplete="off" @submit="createWalletClick">
        <div class="field grid">
          <label for="newwallet-name" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("login.new_wallet_name") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText
              id="newwallet-name"
              v-model="newname"
              class="w-full my-2"
              autocomplete="off"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="newwallet-pass" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("login.new_wallet_pass") }}
          </label>
          <div class="col-12 md:col-10">
            <Password
              inputId="newwallet-pass"
              v-model="pass"
              type="password"
              class="w-full"
              inputClass="w-full"
              autocomplete="new-password"
            />
          </div>
        </div>
        <div class="field grid">
          <div class="col-12 mb-2 md:col-2 md:mb-0"></div>
          <div class="col-12 md:col-10">
            <Button type="submit" id="new_wallet_button_create">
              {{ $t("login.new_wallet_button_create") }}
            </Button>
            <router-link to="/import-wallet" class="mx-2">
              <Button severity="secondary" id="new_wallet_button_import">
                {{ $t("login.new_wallet_button_import") }}
              </Button>
            </router-link>
            <Button
              v-if="wallets.length > 0"
              severity="secondary"
              class="mx-2"
              @click="newWalletForm = false"
              id="go_back"
            >
              {{ $t("global.go_back") }}
            </Button>
            <p class="my-2">
              {{ $t("login.new_wallet_help1") }}
            </p>
            <p class="my-2">
              {{ $t("login.new_wallet_help2") }}
            </p>
          </div>
        </div>
      </form>
    </Panel>
    <Panel v-if="!newWalletForm" class="col-12 md:col-8 lg:col-6">
      <template #header>
        {{ $t("login.open_wallet") }}
      </template>
      <form @submit="auth">
        <div class="field grid">
          <label for="wallet-select" class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("login.select_wallet")
          }}</label>
          <div class="col-12 md:col-10">
            <Dropdown
              id="wallet-select"
              v-model="wallet"
              :options="wallets"
              filter
              class="my-2 w-full"
              optionLabel="name"
              optionValue="code"
              :placeholder="$t('login.select_wallet')"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="wallet-pass" class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("login.wallet_password")
          }}</label>
          <div class="col-12 md:col-10">
            <Password
              inputId="wallet-pass"
              v-model="pass"
              class="w-full my-2"
              inputClass="w-full"
              :feedback="false"
              autocomplete="new-password"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="wallet-pass" class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button type="submit" id="new_wallet_button_open">
              {{ $t("login.new_wallet_button_open") }}
            </Button>
          </div>
        </div>
      </form>
    </Panel>
    <div class="my-5">
      <a
        v-for="lang in $store.state.config.languages"
        :key="lang"
        class="m-2 d-inline-block"
        role="button"
        @click="setLanguage(lang)"
      >
        <Button size="small" severity="secondary" link class="m-2">
          <img
            :src="'/flags/3x2/' + lang + '.svg'"
            height="50"
            class="border border-1 border-round-xl"
          />
        </Button>
      </a>
      <a
        class="m-2"
        href="https://github.com/scholtz/wallet/wiki/I-want-to-help-to-translate"
        target="_blank"
        role="button"
        style="width: 75; height: 50"
      >
        <Button size="small" severity="secondary" link class="m-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="50"
            height="50"
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
    <div class="my-5">
      <a href="https://youtu.be/cCsx7t68DS4" target="youtube" role="button">
        <Button size="small" severity="secondary" link class="m-2">
          Youtube - {{ $t("login.basic_usage") }}
        </Button></a
      >
      <a href="https://youtu.be/M0KZvp7AJQs" target="youtube" role="button">
        <Button size="small" severity="secondary" link class="m-2">
          Youtube - {{ $t("login.tether_usage") }}
        </Button>
      </a>
      <a
        href="https://github.com/scholtz/wallet/"
        target="github"
        role="button"
      >
        <Button size="small" severity="secondary" link class="m-2">
          GitHub: {{ $t("login.source_code") }}
        </Button>
      </a>
      <a href="/donate" class="m-2" role="button">
        <Button size="small" severity="secondary" link class="m-2">
          Support us
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

    if (this.wallets.length === 0) {
      this.$router.push("/new-wallet");
    }
    if (this.wallets.length === 1) {
      this.wallet = this.wallets[0].code;
    }
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
    setLanguage(lang) {
      this.$i18n.locale = lang;
      localStorage.setItem("lang", this.$i18n.locale);
    },
  },
};
</script>
