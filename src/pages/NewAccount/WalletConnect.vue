<template>
  <MainLayout>
    <h1>{{ $t("new_account_wc.title") }}</h1>
    <div v-if="lastError">
      <div class="alert alert-danger">
        {{ $t("new_account_wc.last_error") }}: {{ lastError }}
      </div>
    </div>
    <h3>{{ $t("new_account_wc.account_name") }}</h3>
    <input v-model="name" class="form-control my-2" />

    <div v-if="scannable">
      <h3>{{ $t("new_account_wc.scan") }}</h3>
      <QRCodeVue3
        :width="400"
        :height="400"
        :value="uri"
        :qr-options="{ errorCorrectionLevel: 'H' }"
      />
      <button class="btn btn-primary m-1" @click="clickCopy">
        {{ $t("new_account_wc.copy") }}
      </button>
    </div>
    <div v-if="params">
      <div v-if="params.accounts[0]">
        {{ $t("new_account_wc.address") }}: {{ params.accounts[0] }}
      </div>
      <button class="btn btn-primary my-2" @click="clickSave">
        {{ $t("new_account_wc.save_address") }}
      </button>
    </div>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import QRCodeVue3 from "qrcode-vue3";
import WalletConnect from "@walletconnect/client";
import copy from "copy-to-clipboard";

import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
    QRCodeVue3,
  },
  data() {
    return {
      lastError: "",
      name: "",
      uri: "",
      params: null,
      connector: null,
    };
  },
  computed: {
    scannable() {
      return this.uri && !this.params;
    },
  },
  mounted() {
    this.lastError = "";
    this.prolong();

    this.connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      session: {},
    });

    this.connector.createSession().then(() => {
      this.uri = this.connector.uri;
    });

    // Subscribe to connection events
    this.connector.on("connect", (error, payload) => {
      if (error) {
        throw error;
      }

      this.params = payload.params[0];
    });
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      openError: "toast/openError",
      addWalletConnectAccount: "wallet/addWalletConnectAccount",
    }),
    async clickCopy() {
      if (copy(this.uri)) {
        alert(this.$t("global.copied_to_clipboard"));
      }
    },
    async clickSave() {
      if (this.connector) {
        this.connector.off("connect");
      }

      try {
        this.lastError = "";
        await this.addWalletConnectAccount({
          name: this.name,
          addr: this.params.accounts[0],
          session: this.connector.session,
        });
        this.$router.push({ name: "Accounts" });
      } catch (Error) {
        console.error(Error.message);
        this.lastError = Error;
      }
    },
  },
};
</script>
