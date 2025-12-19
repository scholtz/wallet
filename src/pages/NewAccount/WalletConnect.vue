<template>
  <MainLayout>
    <h1>{{ $t("new_account_wc.title") }}</h1>

    <Card>
      <template #content>
        <div v-if="lastError">
          <Message severity="error">
            {{ $t("new_account_wc.last_error") }}: {{ lastError }}
          </Message>
        </div>
        <Button v-if="!uri" @click="initWalletConnect">
          {{ $t("new_account_wc.show_qr_code") }}
        </Button>

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
          <Button class="m-1" @click="clickCopy">
            {{ $t("new_account_wc.copy") }}
          </Button>
        </div>
        <div v-if="session">
          <div class="field grid">
            <label for="account_name" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("new_account_wc.account_name") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText id="account_name" v-model="name" class="w-full" />
            </div>
          </div>

          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <div v-if="account">
                {{ $t("new_account_wc.address") }}: {{ account }}
              </div>
            </div>
          </div>

          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Button class="my-2" @click="clickSave" :disabled="formInvalid">
                {{ $t("new_account_wc.save_address") }}
              </Button>
            </div>
          </div>
        </div>
      </template>
    </Card>
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
    formInvalid() {
      return !(this.name && this.account);
    },
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
    onSessionEvent() {},
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
