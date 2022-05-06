<template>
  <main-layout>
    <h1>
      {{ $t("receive.title") }} <span v-if="account">{{ account.name }}</span>
    </h1>
    <label for="paynote">{{ $t("receive.note") }}</label>
    <input id="paynote" v-model="paynote" class="form-control" />

    <div class="form-check m-1">
      <input
        id="paynoteB64"
        v-model="paynoteB64"
        class="form-check-input"
        type="checkbox"
      />
      <label class="form-check-label" for="paynoteB64">
        {{ $t("pay.note_is_b64") }}
      </label>
    </div>
    <div class="form-check m-1">
      <input
        id="noteeditable"
        v-model="noteeditable"
        class="form-check-input"
        type="checkbox"
      />
      <label class="form-check-label" for="noteeditable">
        {{ $t("receive.noteeditable") }}
      </label>
    </div>

    <label for="payamount">{{ $t("pay.asset") }}</label>
    <select id="asset" v-model="asset" class="form-control">
      <option
        v-for="asset in assets"
        :key="asset['asset-id']"
        :value="asset['asset-id']"
      >
        {{ asset["name"] }}
      </option>
    </select>

    <label for="payamount">{{ $t("receive.amount") }}</label>
    <input
      id="payamount"
      v-model="payamount"
      type="number"
      min="0.000001"
      max="999999999"
      step="0.000001"
      class="form-control"
    />
    <label for="decimals">{{ $t("receive.decimals") }}</label>
    <input
      id="decimals"
      v-model="decimals"
      disabled
      type="number"
      min="0"
      max="6"
      step="1"
      class="form-control"
    />
    <label for="payto"
      >{{ $t("receive.address") }}: <b>{{ account.name }}</b></label
    >
    <input
      v-if="account"
      id="payto"
      v-model="account.addr"
      class="form-control"
      disabled
    />

    <label for="label">{{ $t("receive.label") }}</label>
    <input id="label" v-model="label" class="form-control my-2" />

    <QRCodeVue3
      :width="400"
      :height="400"
      :value="qrcode"
      :qr-options="{ errorCorrectionLevel: 'H' }"
      image="/img/algorand-algo-logo-96.png"
    />
    <code>{{ qrcode }}</code>
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
      asset: "",
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
      if (this.asset) {
        ret += "&asset=" + this.asset;
      }
      console.log("qrcode", ret);
      return ret;
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      );
    },
  },
  watch: {
    account() {
      this.makeAssets();
    },
    async asset() {
      if (!this.asset) {
        this.assetObj = {
          "asset-id": undefined,
          name: "ALGO",
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
    console.log("qrcode", this.qrcode, this.account);

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
      if (this.account && this.account.amount > 0) {
        this.assets.push({
          "asset-id": "",
          amount: this.account.amount,
          name: "ALG",
          decimals: 6,
          "unit-name": "",
        });
      }
      if (this.account) {
        for (let index in this.account.assets) {
          const asset = await this.getAsset({
            assetIndex: this.account.assets[index]["asset-id"],
          });
          console.log("asset", asset);
          if (asset) {
            this.assets.push({
              "asset-id": this.account.assets[index]["asset-id"],
              amount: this.account.assets[index]["amount"],
              name: asset["name"],
              decimals: asset["decimals"],
              "unit-name": asset["unit-name"],
            });
          }
        }
      }
      console.log("this.assets", this.assets);
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
      console.log("this.signMultisigWith", this.signMultisigWith);
      const selected = Object.values(this.signMultisigWith);
      for (const acc in this.accountsFromMultisig) {
        if (!selected.includes(this.accountsFromMultisig[acc].addr)) {
          continue;
        }

        if (rawSignedTxn == null) {
          const sk = await this.getSK({
            addr: this.accountsFromMultisig[acc].addr,
          });
          console.log(
            "before signMultisigTransaction",
            algosdk,
            this.txn,
            this.account,
            this.account.params,
            sk
          );
          rawSignedTxn = algosdk.signMultisigTransaction(
            this.txn,
            this.account.params,
            sk
          ).blob;
          console.log("rawSignedTxn", rawSignedTxn);
        } else {
          const sk = await this.getSK({
            addr: this.accountsFromMultisig[acc].addr,
          });
          console.log(
            "before appendSignMultisigTransaction",
            rawSignedTxn,
            this.account.params,
            sk
          );
          rawSignedTxn = algosdk.appendSignMultisigTransaction(
            rawSignedTxn,
            this.account.params,
            sk
          ).blob;
          console.log("rawSignedTxn", rawSignedTxn);
        }
      }
      this.rawSignedTxn = this._arrayBufferToBase64(rawSignedTxn);
      console.log("this.rawSignedTxn", this.rawSignedTxn);
      this.rawSignedTxnInput = this.rawSignedTxn;
      /*
      var reader = new FileReader();
      reader.readAsDataURL(new Blob(rawSignedTxn));
      const that = this;
      reader.onloadend = function () {
        var base64 = reader.result.split(",")[1];
        that.rawSignedTxn = base64;
        console.log("rawSignedTxn", that.rawSignedTxn);
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
      console.log("this.multisigDecoded", this.multisigDecoded);
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
        console.log("signedTxn tosend", signedTxn, this.rawSignedTxn);
        const transaction = await this.sendRawTransaction({ signedTxn });
        console.log("transaction", transaction);
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
