<template>
  <PublicLayout>
    <template #header>
      <span />
    </template>
    <template #footer>
      <span />
    </template>

    <h1>
      {{ $t("merchant.make_payment") }}
      <span v-if="asset">{{ asset.name }}</span>
    </h1>

    <Card>
      <template #content>
        <div v-if="b64decode && !b64decode.error" class="my-3">
          {{ $t("merchant.pay") }} {{ b64decode.payamount }}
          <span v-if="asset">{{ asset["unit-name"] }}</span>
          {{ $t("merchant.to_address") }} {{ b64decode.payTo }}
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
        <div v-if="!isPaid">
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

        <Message severity="info" v-if="!isPaid" class="mb-3">
          <ProgressSpinner style="width: 1em; height: 1em" strokeWidth="5" />

          {{ $t("merchant.waiting_for_payment") }}
        </Message>
        <div class="grid">
          <div class="col-12 lg:col-6">
            <QRCodeVue3
              v-if="!isPaid"
              :title="origcode"
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
              <img
                :src="'/flags/3x2/' + lang + '.svg'"
                height="50"
                class="border border-3 rounded rounded-3"
              />
            </a>
          </div>
        </div>
      </template>
    </Card>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import QRCodeVue3 from "qrcode-vue3";
import { mapActions } from "vuex";
import aprotocol from "../shared/algorand-protocol-parse";
import { v4 as uuidv4 } from "uuid";
import base64url from "base64url";

export default {
  components: {
    PublicLayout,
    QRCodeVue3,
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
    isPaid() {
      return (
        this.transactions &&
        this.transactions.transactions &&
        this.transactions.transactions.length > 0
      );
    },
  },
  mounted() {
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
        this.settings = JSON.parse(settings);
      }
    } catch (e) {
      this.openError(e.message);
    }
    this.b64decode = aprotocol.parseAlgorandProtocolParameters(this.origcode);
    this.setNetwork();
    this.makeAsset();
    if (!this.b64decode.paynote) {
      this.b64decode.paynote = "a-wallet/" + uuidv4();
      this.origcode = this.origcode + "&xnote=" + this.b64decode.paynote;
    }
    window.setInterval(() => {
      this.getNotifications();
    }, 5000);
    this.setWebProtocol();
  },
  methods: {
    ...mapActions({
      searchForTransactions: "indexer/searchForTransactions",
      getAsset: "indexer/getAsset",
      openError: "toast/openError",
      setHosts: "config/setHosts",
    }),
    setWebProtocol() {
      if (this.origcode.startsWith("algorand:")) {
        this.codeP2 = "web+" + this.origcode;
      } else {
        this.codeP2 = "web+algorand://" + this.origcode;
      }
    },
    async lowerCountDown() {
      if (this.countDown > 0) {
        this.countDown = this.countDown - 1;
      } else {
        if (!this.formSent) {
          this.formSent = true;
          this.$refs.sendToMerchant.submit();
        }
      }
    },
    async getNotifications() {
      this.transactions = await this.searchForTransactions({
        addr: this.b64decode.payTo,
        note: this.b64decode.paynote,
      });
      if (this.isPaid) {
        if (this.settings.success) {
          if (this.countDown === null) {
            this.countDown = 10;
            window.setInterval(() => {
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
    setNetwork() {
      if (
        this.b64decode.network == "mainnet" ||
        this.b64decode.network == "mainnet-v1.0"
      ) {
        this.setHosts({
          algod: "https://mainnet-api.algonode.cloud",
          kmd: "https://kmd.h2.a-wallet.net",
          indexer: "https://mainnet-idx.algonode.cloud",
        });
      }
      if (this.b64decode.network == "aramidmain") {
        this.setHosts({
          algod: "https://algod.aramidmain.a-wallet.net",
          kmd: "?",
          indexer: "https://indexer.aramidmain.a-wallet.net",
        });
      }
      if (
        this.b64decode.network == "testnet" ||
        this.b64decode.network == "testnet-v1.0"
      ) {
        this.setHosts({
          algod: "https://testnet-api.algonode.cloud",
          kmd: "?",
          indexer: "https://testnet-idx.algonode.cloud",
        });
      }
      if (this.b64decode.network == "sandbox") {
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
    setLanguage(lang) {
      this.$i18n.locale = lang;
      localStorage.setItem("lang", this.$i18n.locale);
    },
  },
};
</script>
