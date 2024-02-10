<template>
  <main-layout>
    <h1>
      {{ $t("receive.title") }} <span v-if="account">{{ account.name }}</span>
    </h1>
    <div class="field grid">
      <label for="paynote" class="col-12 mb-2 md:col-2 md:mb-0">{{
        $t("receive.note")
      }}</label>
      <div class="col-12 md:col-10">
        <InputText id="paynote" v-model="paynote" class="w-full" />
      </div>
    </div>
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <div class="flex align-items-center">
          <Checkbox itemId="paynoteB64" v-model="paynoteB64" binary />
          <label class="form-check-label" for="paynoteB64">
            {{ $t("pay.note_is_b64") }}
          </label>
        </div>
      </div>
    </div>
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <Checkbox itemId="noteeditable" v-model="noteeditable" binary />
        <label class="form-check-label" for="noteeditable">
          {{ $t("receive.noteeditable") }}
        </label>
      </div>
    </div>
    <div class="field grid">
      <label for="payamount" class="col-12 mb-2 md:col-2 md:mb-0">{{
        $t("pay.asset")
      }}</label>
      <div class="col-12 md:col-10">
        <Dropdown
          id="asset"
          :options="assets"
          option-value="asset-id"
          option-label="name"
          v-model="asset"
          class="w-full"
        >
          <template #option="slotProps">
            <div v-if="slotProps.option" class="flex align-items-center">
              <div>
                {{ slotProps.option.name }} ({{ slotProps.option["asset-id"] }})
              </div>
            </div>
          </template>
        </Dropdown>
      </div>
    </div>
    <div class="field grid">
      <label for="payamount" class="col-12 mb-2 md:col-2 md:mb-0">{{
        $t("receive.amount")
      }}</label>
      <div class="col-12 md:col-10">
        <InputGroup>
          <InputNumber
            inputId="payamount"
            v-model="payamount"
            type="number"
            min="0.000001"
            max="999999999"
            step="0.000001"
            class="w-full"
          />
          <InputGroupAddon>{{ assetName }}</InputGroupAddon>
        </InputGroup>
      </div>
    </div>
    <div class="field grid">
      <label for="decimals" class="col-12 mb-2 md:col-2 md:mb-0">{{
        $t("receive.decimals")
      }}</label>
      <div class="col-12 md:col-10">
        <InputNumber
          inputId="decimals"
          v-model="decimals"
          disabled
          type="number"
          min="0"
          max="18"
          step="1"
          class="w-full"
        />
      </div>
    </div>
    <div class="field grid">
      <label for="payto" class="col-12 mb-2 md:col-2 md:mb-0">
        {{ $t("receive.address") }}: <b>{{ account.name }}</b>
      </label>
      <div class="col-12 md:col-10">
        <InputText
          v-if="account"
          id="payto"
          v-model="account.addr"
          class="w-full"
          disabled
        />
      </div>
    </div>
    <div class="field grid">
      <label for="label" class="col-12 mb-2 md:col-2 md:mb-0">{{
        $t("receive.label")
      }}</label>
      <div class="col-12 md:col-10">
        <InputText id="label" v-model="label" class="w-full my-2" />
      </div>
    </div>
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <QRCodeVue3
          :width="400"
          :height="400"
          :value="qrcode"
          :qr-options="{ errorCorrectionLevel: 'H' }"
          image="/img/algorand-algo-logo-96.png"
        />
      </div>
    </div>
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <code>{{ qrcode }}</code>
      </div>
    </div>
  </main-layout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import QRCodeVue3 from "qrcode-vue3";
import { mapActions } from "vuex";
import algosdk from "algosdk";
export default {
  components: {
    MainLayout,
    QRCodeVue3,
  },
  data() {
    return {
      payamount: 0,
      paynote: "",
      paynoteB64: false,
      decimals: 0,
      label: "",
      noteeditable: true,
      assets: [],
      assetObj: {},
      asset: 0,
    };
  },
  computed: {
    qrcode() {
      if (!this.account) return "";
      let ret = "algorand://" + this.account.addr;
      if (
        this.payamount > 0 ||
        this.paynoteB64 ||
        this.paynote ||
        this.label ||
        this.asset
      ) {
        ret += "?";
      }
      if (this.payamount > 0) {
        if (this.decimals > 0) {
          ret +=
            "&amount=" +
            Math.round(this.payamount * Math.pow(10, this.decimals));
        } else {
          ret += "&amount=" + this.payamount;
        }
      }
      if (this.paynoteB64) {
        ret += "&noteB64=1";
      }

      if (this.paynote && this.noteeditable) {
        ret += "&note=" + this.paynote;
      }
      if (this.paynote && !this.noteeditable) {
        ret += "&xnote=" + this.paynote;
      }
      if (this.label) {
        ret += "&label=" + this.label;
      }
      if (this.asset > 0) {
        ret += "&asset=" + this.asset;
      }
      return ret;
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      );
    },
    accountData() {
      if (!this.account) return false;
      if (!this.account.data) return false;
      return this.account.data[this.$store.state.config.env];
    },
    assetName() {
      const asset = this.assets.find((a) => a["asset-id"] == this.asset);
      if (!asset) return "Algo";
      return asset.name;
    },
  },
  watch: {
    account() {
      this.makeAssets();
    },
    async asset() {
      if (!this.asset) {
        this.assetObj = {
          "asset-id": 0,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
        };
      } else {
        this.assetObj = await this.getAsset({
          assetIndex: this.asset,
        });
      }
      this.decimals = this.assetObj.decimals;
    },
  },
  mounted() {
    this.makeAssets();
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      makePayment: "algod/makePayment",
      waitForConfirmation: "algod/waitForConfirmation",
      lastActiveAccount: "wallet/lastActiveAccount",
      getTransactionParams: "algod/getTransactionParams",
      sendRawTransaction: "algod/sendRawTransaction",
      getSK: "wallet/getSK",
      getAsset: "indexer/getAsset",
    }),
    async makeAssets() {
      this.assets = [];
      if (this.accountData && this.accountData.amount > 0) {
        this.assets.push({
          "asset-id": 0,
          amount: this.accountData.amount,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": "",
        });
      }
      if (this.accountData) {
        for (let index in this.accountData.assets) {
          const asset = await this.getAsset({
            assetIndex: this.accountData.assets[index]["asset-id"],
          });
          if (asset) {
            this.assets.push({
              "asset-id": this.accountData.assets[index]["asset-id"],
              amount: this.accountData.assets[index]["amount"],
              name: asset["name"],
              decimals: asset["decimals"],
              "unit-name": asset["unit-name"],
            });
          }
        }
      }
    },
    reset() {
      this.subpage = "";
      this.error = "";
      this.confirmedRound = "";
      this.processing = true;
      this.page = "review";
      this.signMultisigWith = [];
      this.rawSignedTxn = "";
      this.rawSignedTxnInput = "";
    },
    previewPaymentClick(e) {
      this.page = "review";
      this.prolong();
      e.preventDefault();
    },
    async payMultisig() {
      this.prolong();
      const multsigaddr = this.$route.params.account;
      const payTo = this.payto;
      const amount = this.amountLong;
      const enc = new TextEncoder();
      const note = enc.encode(this.paynote);

      let params = await this.getTransactionParams();
      // comment out the next two lines to use suggested fee
      params.fee = 1000;
      params.flatFee = true;
      this.txn = algosdk.makePaymentTxnWithSuggestedParams(
        multsigaddr,
        payTo,
        amount,
        undefined,
        note,
        params
      );
      //let txId = txn.txID().toString();
    },
    async signMultisig(e) {
      this.prolong();
      e.preventDefault();
      let rawSignedTxn = null;
      if (this.rawSignedTxnInput) {
        rawSignedTxn = this._base64ToArrayBuffer(this.rawSignedTxnInput);
      }
      const selected = Object.values(this.signMultisigWith);
      for (const acc in this.accountsFromMultisig) {
        if (!selected.includes(this.accountsFromMultisig[acc].addr)) {
          continue;
        }

        if (rawSignedTxn == null) {
          const sk = await this.getSK({
            addr: this.accountsFromMultisig[acc].addr,
          });
          rawSignedTxn = algosdk.signMultisigTransaction(
            this.txn,
            this.account.params,
            sk
          ).blob;
        } else {
          const sk = await this.getSK({
            addr: this.accountsFromMultisig[acc].addr,
          });
          rawSignedTxn = algosdk.appendSignMultisigTransaction(
            rawSignedTxn,
            this.account.params,
            sk
          ).blob;
        }
      }
      this.rawSignedTxn = this._arrayBufferToBase64(rawSignedTxn);
      this.rawSignedTxnInput = this.rawSignedTxn;
      /*
      var reader = new FileReader();
      reader.readAsDataURL(new Blob(rawSignedTxn));
      const that = this;
      reader.onloadend = function () {
        var base64 = reader.result.split(",")[1];
        that.rawSignedTxn = base64;
      };/**/
    },
    _arrayBufferToBase64(buffer) {
      var binary = "";
      var bytes = new Uint8Array(buffer);
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
    _base64ToArrayBuffer(base64) {
      var binary_string = window.atob(base64);
      var len = binary_string.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes.buffer;
    },
    loadMultisig(e) {
      this.prolong();
      e.preventDefault();
      this.multisigDecoded = algosdk.decodeSignedTransaction(
        this._base64ToArrayBuffer(this.rawSignedTxnInput)
      );
      this.page = "review";
    },
    encodeAddress(a) {
      return algosdk.encodeAddress(a);
    },
    async sendMultisig(e) {
      this.prolong();
      this.error = "";

      this.processing = true;
      try {
        e.preventDefault();
        const signedTxn = this._base64ToArrayBuffer(this.rawSignedTxn);
        const transaction = await this.sendRawTransaction({ signedTxn });
        this.tx = transaction.txId;
        const confirmation = await this.waitForConfirmation({
          txId: this.tx,
          timeout: 4,
        });
        if (!confirmation) {
          this.processing = false;
          this.error = this.$t("pay.state_error_not_sent");
          // "Payment has probably not reached the network. Are you offline? Please check you account";
          return;
        }
        if (confirmation["confirmed-round"]) {
          this.processing = false;
          this.confirmedRound = confirmation["confirmed-round"];
        }
        if (confirmation["pool-error"]) {
          this.processing = false;
          this.error = confirmation["pool-error"];
        }
      } catch (e) {
        this.processing = false;
        this.error = e;
      }
    },
  },
};
</script>
