<template>
  <PublicLayout>
    <template #header>
      <span />
    </template>
    <template #footer>
      <span />
    </template>

    <h1>
      <span class="page-title-icon"
        ><i class="pi pi-credit-card" aria-hidden="true"
      /></span>
      {{ $t("merchant.make_payment") }}
      <span v-if="asset">{{ asset.name }}</span>
    </h1>

    <Card>
      <template #content>
        <div v-if="ready && !b64decode.error" class="my-3">
          {{ $t("merchant.pay") }} {{ b64decode.payamount }}
          <span v-if="asset">{{ asset.unitName }}</span>
          {{ $t("merchant.to_address") }}
          <AlgorandAddress :address="b64decode.payTo" />
          {{ $t("merchant.please") }}
          <table class="w-100">
            <tbody>
              <tr v-if="b64decode.network">
                <td>{{ $t("merchant.network") }}:</td>
                <td>
                  <code>{{ b64decode.network }}</code>
                </td>
              </tr>
              <tr v-if="b64decode.paynote">
                <td>{{ $t("merchant.matching_symbol") }}:</td>
                <td>
                  <code>{{ b64decode.paynote }}</code>
                </td>
              </tr>
              <tr v-if="b64decode.fee">
                <td>{{ $t("merchant.network_fee") }}:</td>
                <td>
                  <code>{{ b64decode.fee }} ALGO</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="b64decode.error" class="my-3">
          {{ b64decode.error }}
        </div>
        <div v-else>
          <ProgressSpinner style="width: 1em; height: 1em" strokeWidth="5" />
        </div>
        <div v-if="!isPaid && payable">
          <a :href="origcode" :title="origcode" role="button">
            <Button severity="primary" size="large" class="mb-3">
              {{ $t("merchant.pay_qr") }}
            </Button>
          </a>
          <a :href="origcode" :title="origcode">
            <Button severity="secondary" size="large" class="mx-3 mb-3">
              {{ $t("merchant.pay_nativewallet") }}
            </Button>
          </a>
          <a :href="codeP2" :title="codeP2">
            <Button severity="secondary" size="large" class="mx-3 mb-3">
              {{ $t("merchant.pay_webwallet") }}
            </Button>
          </a>
          <a v-if="settings.cancel" :href="settings.cancel">
            <Button severity="secondary" size="large" class="mx-3 mb-3">
              {{ $t("merchant.cancel_payment") }}
            </Button>
          </a>
        </div>

        <Message severity="success" v-if="isPaid" class="mb-3">
          {{ $t("merchant.payment_received") }}
        </Message>

        <form
          v-if="isPaid && settings.success"
          ref="sendToMerchant"
          :action="settings.success"
          method="POST"
        >
          <input
            type="hidden"
            name="txId"
            :value="transactions.transactions[0].id"
          />
          <Button type="submit" class="my-2" size="large">
            {{ $t("merchant.go_back_to_merchant") }}
          </Button>
          <Badge severity="info" class="m-2" :value="'(' + countDown + ')'" />
        </form>

        <Message severity="info" v-if="!isPaid && payable" class="mb-3">
          <ProgressSpinner style="width: 1em; height: 1em" strokeWidth="5" />

          {{ $t("merchant.waiting_for_payment") }}
        </Message>
        <div class="grid">
          <div class="col-12 lg:col-6">
            <QRCodeVue3
              v-if="!isPaid && payable"
              :title="origcode"
              imgclass="qr-code"
              :width="400"
              :height="400"
              :value="origcode"
              :key="origcode"
              :qr-options="{ errorCorrectionLevel: 'H' }"
              :image="assetImage"
            />
          </div>
          <div class="col-12 lg:col-6">
            <a
              v-for="lang in $store.state.config.languages"
              :key="lang"
              class="m-2 d-inline-block"
              role="button"
              @click="setLanguage(lang)"
            >
              <LanguageFlag :locale="lang" size="2rem" />
            </a>
          </div>
        </div>
      </template>
    </Card>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import AlgorandAddress from "../components/AlgorandAddress.vue";
import QRCodeVue3 from "qrcode-vue3";
import { mapActions } from "vuex";
import algosdk from "algosdk";
import aprotocol from "../shared/algorand-protocol-parse";
import {
  gatewayIndexerEndpoint,
  isAlgorandPaymentUri,
  sanitizeGatewaySettings,
} from "../scripts/merchantGateway";
import { v4 as uuidv4 } from "uuid";
import base64url from "base64url";

export default {
  components: {
    PublicLayout,
    QRCodeVue3,
    AlgorandAddress,
  },
  data() {
    return {
      origcode: "",
      codeP2: "",
      b64decode: {},
      settings: {},
      asset: {},

      transactions: [],
      formSent: false,
      polling: false,
      ready: false,
      unmounted: false,
      countDown: null,
    };
  },
  computed: {
    assetImage() {
      if (this.b64decode.asset == 312769) {
        return "/img/tether-usdt-logo-96.png";
      }
      if (this.asset["assetId"] === "") {
        return "/img/algorand-algo-logo-96.png";
      }
      return "";
    },
    // Links and QR are offered only after the payee, network and asset were all validated.
    payable() {
      return this.ready && !!this.origcode;
    },
    isPaid() {
      return (
        this.transactions &&
        this.transactions.transactions &&
        this.transactions.transactions.length > 0
      );
    },
  },
  async mounted() {
    // Everything decoded from the URL is attacker-controlled (AW-2026-076): only an algorand
    // payment URI may reach the pay links/QR, and only validated https URLs the redirects.
    let rawSettings = {};
    try {
      try {
        this.origcode = atob(this.$route.params.b64);
      } catch {
        this.origcode = base64url.decode(this.$route.params.b64);
      }
      if (this.$route.params.settings) {
        let settings = "";
        try {
          settings = atob(this.$route.params.settings);
        } catch {
          settings = base64url.decode(this.$route.params.settings);
        }
        rawSettings = JSON.parse(settings);
      }
    } catch (e) {
      this.openError(e.message);
    }
    this.settings = sanitizeGatewaySettings(rawSettings);
    if (!isAlgorandPaymentUri(this.origcode)) {
      const message = this.$t("merchant.invalid_payment_uri");
      this.origcode = "";
      this.b64decode = { error: message };
      this.openError(message);
      return;
    }
    try {
      this.b64decode = aprotocol.parseAlgorandProtocolParameters(this.origcode);
    } catch {
      // e.g. a malformed percent-escape in the note
      this.b64decode = {};
    }
    // Without a real payee the indexer would be asked for all transactions, and a network this
    // page cannot query would be answered by whatever chain the user happens to have selected.
    const rejection = !algosdk.isValidAddress(this.b64decode.payTo ?? "")
      ? this.$t("merchant.invalid_payment_uri")
      : this.b64decode.network && !gatewayIndexerEndpoint(this.b64decode.network)
      ? this.$t("merchant.unsupported_network")
      : "";
    if (rejection) {
      this.origcode = "";
      this.b64decode = { error: rejection };
      this.openError(rejection);
      return;
    }
    await this.makeAsset();
    if (this.b64decode.error || this.unmounted) return;
    this.ready = true;
    if (!this.b64decode.paynote) {
      this.b64decode.paynote = "a-wallet/" + uuidv4();
      this.origcode +=
        (this.origcode.includes("?") ? "&" : "?") +
        "xnote=" +
        this.b64decode.paynote;
    }
    this.pollTimer = window.setInterval(() => {
      this.getNotifications();
    }, 5000);
    this.setWebProtocol();
  },
  beforeUnmount() {
    this.unmounted = true;
    window.clearInterval(this.pollTimer);
    window.clearInterval(this.countDownTimer);
  },
  methods: {
    ...mapActions({
      openError: "toast/openError",
    }),
    // The payment poll uses the network named in the URI through its own client; it must not
    // rewrite the user's persisted node settings (AW-2026-076).
    gatewayIndexer() {
      const endpoint = gatewayIndexerEndpoint(this.b64decode.network);
      if (endpoint) {
        return new algosdk.Indexer(
          endpoint.token,
          endpoint.server,
          new URL(endpoint.server).port
        );
      }
      const config = this.$store.state.config;
      return new algosdk.Indexer(
        config.indexerToken,
        config.indexer,
        new URL(config.indexer).port
      );
    },
    async searchForTransactions({ addr, note }) {
      try {
        const search = this.gatewayIndexer().searchForTransactions().address(addr);
        if (note) {
          search.notePrefix(new TextEncoder().encode(note));
        }
        return await search.do();
      } catch (error) {
        console.error("searchForTransactions", error);
        return undefined;
      }
    },
    async getAsset({ assetIndex }) {
      try {
        const res = await this.gatewayIndexer()
          .searchForAssets()
          .index(assetIndex)
          .do();
        const params = res?.assets?.[0]?.params;
        if (!params) return undefined;
        return {
          name: params.name,
          decimals: params.decimals,
          unitName: params.unitName,
        };
      } catch (error) {
        console.error("getAsset", error);
        return undefined;
      }
    },
    setWebProtocol() {
      // origcode is always algorand:// or web+algorand:// by now (isAlgorandPaymentUri).
      this.codeP2 = this.origcode.startsWith("web+")
        ? this.origcode
        : "web+" + this.origcode;
    },
    async lowerCountDown() {
      if (this.countDown > 0) {
        this.countDown = this.countDown - 1;
      } else {
        if (!this.formSent) {
          this.formSent = true;
          window.clearInterval(this.countDownTimer);
          this.$refs.sendToMerchant.submit();
        }
      }
    },
    async getNotifications() {
      if (this.isPaid || this.polling) return;
      this.polling = true;
      let found;
      try {
        found = await this.searchForTransactions({
          addr: this.b64decode.payTo,
          note: this.b64decode.paynote,
        });
      } finally {
        this.polling = false;
      }
      // A failed poll must not erase a payment that was already seen.
      if (found) this.transactions = found;
      if (this.isPaid) {
        window.clearInterval(this.pollTimer);
        if (this.settings.success) {
          if (this.countDown === null) {
            this.countDown = 10;
            this.countDownTimer = window.setInterval(() => {
              this.lowerCountDown();
            }, 1000);
          }
        }
      }
    },
    async makeAsset() {
      this.asset = {};
      if (this.b64decode && this.b64decode.asset > 0) {
        const newAsset = await this.getAsset({
          assetIndex: this.b64decode.asset,
        });
        if (newAsset && newAsset.decimals !== undefined) {
          this.asset = newAsset;
        } else {
          const errorMsg =
            this.$t("merchant.error_asset") + this.b64decode.asset;
          this.openError(errorMsg);
          this.b64decode.error = errorMsg;
          // The amount could not be validated against the asset, so nothing may be payable.
          this.origcode = "";
          return;
        }
      } else {
        this.asset = {
          assetId: "",
          amount: 0,
          name: "ALG",
          decimals: 6,
          unitName: "Algo",
        };
      }
      // transfer to asset decimals
      this.b64decode.payamountLong = this.b64decode.payamount;
      this.b64decode.payamount =
        this.b64decode.payamount / Math.pow(10, this.asset.decimals);

      if (!this.b64decode.feeLong) {
        if (!this.b64decode.fee) {
          this.b64decode.fee = 0.001;
          this.b64decode.feeLong = 1000;
        } else {
          this.b64decode.feeLong = this.b64decode.fee;
          this.b64decode.fee = this.b64decode.fee / 1000000;
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
