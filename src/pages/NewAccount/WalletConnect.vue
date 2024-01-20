<template>
  <MainLayout>
    <h1>{{ $t("new_account_wc.title") }}</h1>
    <div v-if="lastError">
      <div class="alert alert-danger">
        {{ $t("new_account_wc.last_error") }}: {{ lastError }}
      </div>
    </div>
    <button v-if="!uri" class="btn btn-primary" @click="initWalletConnect">
      {{ $t("new_account_wc.show_qr_code") }}
    </button>

    <div v-if="scannable">
      <h3>{{ $t("new_account_wc.scan") }}</h3>
      <QRCodeVue3
        :width="275"
        :height="275"
        :value="uri"
        :dotsOptions="{
          type: 'dots',
          color: '#26249a',
          gradient: {
            type: 'linear',
            rotation: 0,
            colorStops: [
              { offset: 0, color: '#3396ff' },
              { offset: 1, color: '#3396ff' },
            ],
          },
        }"
        :qr-options="{ errorCorrectionLevel: 'L' }"
        image="/img/wc-logo.png"
      />
      <button class="btn btn-primary m-1" @click="clickCopy">
        {{ $t("new_account_wc.copy") }}
      </button>
    </div>
    <div v-if="session">
      <h3>{{ $t("new_account_wc.account_name") }}</h3>
      <input v-model="name" class="form-control my-2" />
      <div v-if="account">
        {{ $t("new_account_wc.address") }}: {{ account }}
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
      session: null,
      connector: null,
      currentChain: "",
    };
  },
  computed: {
    scannable() {
      return this.uri && !this.session;
    },
    account() {
      if (!this.session) return "";
      if (!this.session.namespaces) return "";
      if (!this.session.namespaces.algorand) return "";
      if (!this.session.namespaces.algorand.accounts) return "";
      const accountKeys = Object.keys(
        this.session.namespaces.algorand.accounts
      );
      if (accountKeys.length <= 0) return "";
      return this.session.namespaces.algorand.accounts[accountKeys[0]].replace(
        `algorand:${this.currentChain}:`,
        ""
      );
    },
  },
  async mounted() {
    this.lastError = "";
    this.prolong();
    this.currentChain = await this.getCurrentChainId();
    this.initWalletConnect();
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      openSuccess: "toast/openSuccess",
      openError: "toast/openError",
      getCurrentChainId: "publicData/getCurrentChainId",
      addWalletConnect2Account: "wallet/addWalletConnect2Account",
      initWC: "wcClient/init",
    }),
    onSessionEvent(e) {},
    async clickCopy() {
      if (copy(this.uri)) {
        this.openSuccess(this.$t("global.copied_to_clipboard"));
      }
    },
    async clickSave() {
      if (this.connector) {
        this.connector.off("connect");
      }

      try {
        this.lastError = "";
        await this.addWalletConnect2Account({
          name: this.name,
          addr: this.account,
          session: this.session,
        });
        this.$router.push({ name: "Accounts" });
      } catch (Error) {
        console.error(Error.message);
        this.lastError = Error;
      }
    },
    async initWalletConnect() {
      try {
        const provider = await this.initWC();

        provider.on("display_uri", (uri) => {
          this.uri = uri;
        });

        const session = await provider.connect({
          namespaces: {
            algorand: {
              methods: ["algo_signTxn"],
              chains: [`algorand:${this.currentChain}`],
              events: ["chainChanged", "accountsChanged"],
            },
            //skipPairing: true, // optional to skip pairing ( later it can be resumed by invoking .pair())
          },
        });
        this.session = session;
      } catch (err) {
        console.error("error in initWalletConnect", err);
        this.uri = "";
        this.openError(`Error occured: ${err.message ?? err}`);
      }
    },
  },
};
</script>
