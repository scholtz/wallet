<template>
  <main-layout>
    <div v-if="!this.$route.params.account">
      <h1>Select account from which you want to make the payment</h1>

      <select class="form-control" v-model="payFromDirect">
        <option
          v-for="option in $store.state.wallet.privateAccounts"
          :key="option.addr"
          :value="option.addr"
        >
          {{ option.name + "  - " + option.addr }}
        </option>
      </select>
    </div>
    <div v-if="account">
      <form @submit="previewPaymentClick" v-if="page == 'design'">
        <h1>{{ $t("pay.title") }} {{ account.name }}</h1>
        <p>{{ $t("pay.selected_account") }}: {{ account.addr }}</p>
        <div v-if="isMultisig && !subpage">
          <h2>{{ $t("pay.multisig_account") }}</h2>
          <button class="btn btn-primary my-2" @click="subpage = 'proposal'">
            {{ $t("pay.create_proposal") }}
          </button>
          <button class="btn btn-primary m-2" @click="subpage = 'sign'">
            {{ $t("pay.sign_proposal") }}
          </button>
        </div>
        <div class="row" v-if="subpage == 'sign'">
          <div class="col-12">
            <p>{{ $t("pay.signature_from_friend") }}:</p>
            <textarea
              class="form-control my-2"
              v-model="rawSignedTxnInput"
              rows="8"
            ></textarea>
            <button class="btn btn-primary my-2" @click="loadMultisig">
              {{ $t("pay.load_multisig_data") }}
            </button>
          </div>
        </div>
        <div class="row" v-if="showDesignScreen">
          <div :class="scan ? 'col-8' : 'col-12'">
            <div v-if="$route.params.toAccount">
              <input
                v-model="$route.params.toAccount"
                id="payTo"
                disabled
                class="form-control"
              />
            </div>
            <div v-else>
              <ul class="nav nav-tabs">
                <li class="nav-item">
                  <a
                    class="nav-link"
                    :class="genericaccount ? '' : 'active'"
                    @click="genericaccount = false"
                    href="#"
                  >
                    {{ $t("pay.pay_to_wallet") }}</a
                  >
                </li>
                <li class="nav-item">
                  <a
                    class="nav-link"
                    :class="genericaccount ? 'active' : ''"
                    @click="genericaccount = true"
                    href="#"
                    >{{ $t("pay.pay_to_other") }}</a
                  >
                </li>
              </ul>

              <input
                v-if="genericaccount"
                v-model="payTo"
                id="payTo"
                class="form-control"
              />
              <select
                class="form-control"
                v-model="payTo"
                v-if="!genericaccount"
              >
                <option
                  v-for="option in $store.state.wallet.privateAccounts"
                  :key="option.addr"
                  :value="option.addr"
                >
                  {{ option.name + "  - " + option.addr }}
                </option>
              </select>
              <div v-if="genericaccount">
                <button
                  @click="toggleCamera"
                  class="btn btn-primary btn-xs m-2"
                >
                  {{ $t("pay.toggle_camera") }}
                </button>
                <p>
                  {{ $t("pay.store_other_help") }}
                </p>
              </div>
            </div>
            <label for="asset">{{ $t("pay.asset") }}</label>
            <select id="asset" class="form-control" v-model="asset">
              <option
                v-for="asset in assets"
                :key="asset['asset-id']"
                :value="asset['asset-id']"
              >
                {{ asset["name"] }} ({{
                  $filters.formatCurrency(
                    asset["amount"],
                    asset["name"],
                    asset["decimals"]
                  )
                }})
              </option>
            </select>
            <label for="payamount">{{ $t("pay.amount") }}</label>
            <input
              v-model="payamount"
              id="payamount"
              type="number"
              min="0"
              max="99999999"
              step="0.000001"
              class="form-control"
            />
            <button @click="setMaxAmount">{{ $t("pay.set_max") }}</button>
            <label for="fee">Fee</label>
            <input
              v-model="fee"
              id="fee"
              type="number"
              min="0.001"
              max="1"
              step="0.001"
              class="form-control"
            />

            <label for="paynote">{{ $t("pay.note") }}</label>
            <input v-model="paynote" id="paynote" class="form-control" />

            <div class="form-check m-1">
              <input
                class="form-check-input"
                type="checkbox"
                v-model="paynoteB64"
                id="paynoteB64"
              />
              <label class="form-check-label" for="paynoteB64">
                {{ $t("pay.note_is_b64") }}
              </label>
            </div>

            <input
              :disabled="isNotValid"
              class="btn btn-primary my-2"
              type="submit"
              value="Preview payment"
            />
            <input
              v-if="isMultisig"
              class="btn btn-light m-2"
              value="Cancel"
              @click="subpage = ''"
            />
            <input
              v-if="!isMultisig"
              class="btn btn-light m-2"
              value="Cancel"
              @click="$router.push('/accounts')"
            />
          </div>

          <div v-if="scan" class="col-4">
            <QrcodeStream @decode="onDecodeQR" />
          </div>
        </div>
      </form>
      <form @submit="payPaymentClick" v-if="page == 'review'">
        <h1>{{ $t("pay.review_payment") }}</h1>
        <p>{{ $t("pay.review_payment_help") }}</p>
        <table class="table" v-if="!multisigDecoded.txn">
          <tr>
            <th>{{ $t("pay.from_account") }}:</th>
            <td>{{ payFrom }}</td>
          </tr>
          <tr>
            <th>{{ $t("pay.pay_to") }}:</th>
            <td>{{ payTo }}</td>
          </tr>
          <tr>
            <th>{{ $t("pay.note") }}:</th>
            <td>{{ paynote }}</td>
          </tr>
          <tr>
            <th>{{ $t("pay.amount") }}:</th>
            <td>
              {{
                $filters.formatCurrency(
                  amountLong,
                  this.assetObj.name,
                  this.assetObj.decimals
                )
              }}
            </td>
          </tr>
          <tr>
            <th>{{ $t("pay.fee") }}:</th>
            <td>{{ $filters.formatCurrency(feeLong) }}</td>
          </tr>
          <tr v-if="!asset">
            <th>{{ $t("pay.total") }}:</th>
            <td>{{ $filters.formatCurrency(amountLong + feeLong) }}</td>
          </tr>
        </table>

        <div v-if="multisigDecoded.txn">
          <h2>{{ $t("pay.transaction_details") }}</h2>
          <table class="table">
            <tr>
              <th>{{ $t("pay.type") }}</th>
              <td>{{ multisigDecoded.txn.type }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.name") }}</th>
              <td>{{ multisigDecoded.txn.name }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.amount") }}</th>
              <td>{{ multisigDecoded.txn.amount }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.fee") }}</th>
              <td>{{ multisigDecoded.txn.fee }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.first_round") }}</th>
              <td>{{ multisigDecoded.txn.firstRound }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.last_round") }}</th>
              <td>{{ multisigDecoded.txn.lastRound }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.genesis") }}</th>
              <td>{{ multisigDecoded.txn.genesisID }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.note") }}</th>
              <td>{{ multisigDecoded.txn.note }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.tag") }}</th>
              <td>{{ multisigDecoded.txn.tag }}</td>
            </tr>
            <tr>
              <th>{{ $t("pay.to_account") }}</th>
              <td>{{ encodeAddress(multisigDecoded.txn.to.publicKey) }}</td>
            </tr>
          </table>

          <h2>{{ $t("pay.signatures") }}</h2>
          <table class="table">
            <tr v-for="sig in multisigDecoded.msig.subsig" :key="sig">
              <th>
                <span v-if="sig.s" class="badge bg-success">{{
                  encodeAddress(sig.pk)
                }}</span>
                <span v-if="!sig.s" class="badge bg-danger">{{
                  encodeAddress(sig.pk)
                }}</span>
              </th>
              <td>
                <span v-if="sig.s" class="badge bg-success">{{
                  $t("pay.signed")
                }}</span
                ><span v-if="!sig.s" class="badge bg-danger">{{
                  $t("pay.not_signed")
                }}</span>
              </td>
            </tr>
          </table>
        </div>
        <input
          v-if="!isMultisig"
          class="btn btn-primary"
          type="submit"
          value="Process payment"
        />
        <input
          v-if="isMultisig"
          class="btn btn-primary"
          type="submit"
          value="Create multisig proposal"
        />

        <input
          class="btn btn-light mx-2"
          value="Go back"
          @click="this.page = 'design'"
        />
        <textarea
          class="form-control my-2"
          v-if="txn"
          v-model="txn"
          rows="5"
        ></textarea>
        <div v-if="isMultisig && multisigDecoded.txn">
          <label>{{ $t("pay.sign_with") }}</label>
          <select class="form-control" v-model="signMultisigWith" multiple>
            <option
              v-for="option in accountsFromMultisig"
              :key="option.addr"
              :value="option.addr"
            >
              {{ option.name + "  - " + option.addr }}
            </option>
          </select>
          <button
            class="btn btn-primary my-2"
            @click="signMultisig"
            :disabled="signMultisigWith.length == 0"
          >
            {{ $t("pay.sign") }}
          </button>
          <p v-if="rawSignedTxn">{{ $t("pay.send_to_other_signators") }}:</p>
          <textarea
            class="form-control my-2"
            v-if="rawSignedTxn"
            v-model="rawSignedTxn"
            rows="8"
          ></textarea>
          <button
            class="btn btn-primary m-2"
            @click="sendMultisig"
            :disabled="!rawSignedTxn && !rawSignedTxnInput"
          >
            {{ $t("pay.send_to_network") }}
          </button>
        </div>
        <div
          v-if="
            isMultisig &&
            !multisigDecoded.txn &&
            txn &&
            accountsFromMultisig &&
            accountsFromMultisig.length > 0
          "
        >
          <label>{{ $t("pay.sign_with") }}</label>
          <select class="form-control" v-model="signMultisigWith" multiple>
            <option
              v-for="option in accountsFromMultisig"
              :key="option.addr"
              :value="option.addr"
            >
              {{ option.name + "  - " + option.addr }}
            </option>
          </select>
          <button
            class="btn btn-primary my-2"
            @click="signMultisig"
            :disabled="signMultisigWith.length == 0"
          >
            {{ $t("pay.sign") }}
          </button>
          <p v-if="rawSignedTxn">{{ $t("pay.send_to_other_signators") }}:</p>
          <textarea
            class="form-control my-2"
            v-if="rawSignedTxn"
            v-model="rawSignedTxn"
            rows="8"
          ></textarea>
        </div>

        <p v-if="!tx && processing" class="alert alert-primary my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          ></span>
          {{ $t("pay.state_sending") }}
        </p>
        <p v-if="tx && !confirmedRound" class="alert alert-primary my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          ></span>
          {{ $t("pay.state_sent") }}: {{ tx }}.
          {{ $t("pay.state_waiting_confirm") }}
        </p>
        <p v-if="confirmedRound" class="alert alert-success my-2">
          {{ $t("pay.state_confirmed") }} <b>{{ confirmedRound }}</b
          >. {{ $t("pay.transaction") }}: {{ tx }}.
        </p>
        <p v-if="error" class="alert alert-danger my-2">
          {{ $t("pay.error") }}: {{ error }}
        </p>
      </form>
    </div>
  </main-layout>
</template>

<script>
import { QrcodeStream } from "qrcode-reader-vue3";

import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
import algosdk from "algosdk";
export default {
  components: {
    QrcodeStream,
    MainLayout,
  },
  data() {
    return {
      payFromDirect: "",
      genericaccount: false,
      payamount: 0,
      fee: 0.001,
      payTo: "",
      paynote: "",
      paynoteB64: false,
      page: "design",
      tx: "",
      processing: false,
      error: "",
      confirmation: null,
      confirmedRound: null,
      subpage: "",
      txn: null,
      rawSignedTxn: null,
      rawSignedTxnInput: null,
      signMultisigWith: [],
      multisigDecoded: {},
      assets: [],
      asset: "",
      assetObj: {},
      scan: false,
    };
  },
  computed: {
    isNotValid() {
      if (!this.payTo) return true;
      return false;
    },
    amountLong() {
      let decimals = 6;
      if (this.assetObj && this.assetObj.decimals !== undefined) {
        decimals = this.assetObj.decimals;
      }
      return this.payamount * Math.pow(10, decimals);
    },
    feeLong() {
      return this.fee * Math.pow(10, 6); // algo
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.payFrom
      );
    },
    isMultisig() {
      return !!this.account.params;
    },
    accountsFromMultisig() {
      return this.$store.state.wallet.privateAccounts.filter((a) =>
        this.account.params.addrs.includes(a.addr)
      );
    },
    showDesignScreen() {
      return (
        !this.isMultisig || (this.isMultisig && this.subpage == "proposal")
      );
    },
    payFrom() {
      if (this.$route.params.account) return this.$route.params.account;
      return this.payFromDirect;
    },
  },
  watch: {
    account() {
      console.log("account changed ", this.account);
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
      console.log("assetObj", this.assetObj);
    },
  },
  async mounted() {
    if (!this.payFrom) {
      this.setNoRedirect();
    }
    this.payTo = this.$store.state.wallet.lastpayTo;
    if (this.$route.params.account) {
      this.lastActiveAccount({ addr: this.$route.params.account });
    }
    console.log("account", this.account);
    await this.makeAssets();
  },
  methods: {
    ...mapActions({
      setNoRedirect: "config/setNoRedirect",
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
          this.assets.push({
            "asset-id": this.account.assets[index]["asset-id"],
            amount: this.account.assets[index]["amount"],
            name: asset["name"],
            decimals: asset["decimals"],
            "unit-name": asset["unit-name"],
          });
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
      const multsigaddr = this.payFrom;
      const payTo = this.payTo;
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
          console.log(
            "before appendSignMultisigTransaction",
            rawSignedTxn,
            this.account.params,
            sk
          );
          const sk = await this.getSK({
            addr: this.accountsFromMultisig[acc].addr,
          });
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
    async payPaymentClick(e) {
      this.prolong();
      e.preventDefault();
      try {
        if (this.isMultisig) return this.payMultisig();
        this.reset();
        this.prolong();
        const payTo = this.payTo;
        const payFrom = this.payFrom;
        const amount = this.amountLong;
        const note = this.paynote;
        let fee = this.feeLong;
        const asset = this.asset;

        const enc = new TextEncoder();
        let noteEnc = enc.encode(note);
        if (this.paynoteB64) {
          try {
            noteEnc = Uint8Array.from(this._base64ToArrayBuffer(this.paynote));
            if (!noteEnc) {
              noteEnc = enc.encode(note);
            }
          } catch (e) {
            console.log("Error converting b64 to array");
          }
        }
        console.log("sending payment", {
          payTo,
          payFrom,
          amount,
          noteEnc,
          fee,
          asset,
        });
        this.tx = await this.makePayment({
          payTo,
          payFrom,
          amount,
          noteEnc,
          fee,
          asset,
        });
        const confirmation = await this.waitForConfirmation({
          txId: this.tx,
          timeout: 4,
        });
        if (!confirmation) {
          this.processing = false;
          this.error = this.$t("pay.state_error_not_sent");
          //            "Payment has probably not reached the network. Are you offline? Please check you account";
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
        console.log("confirmation", this.tx, this.confirmation);
      } catch (exc) {
        this.error = exc;
      }
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
    toggleCamera(e) {
      e.preventDefault();
      this.scan = !this.scan;
      if (this.scan) {
        this.payTo = "";
      }
      console.log("camera", this.scan);
    },
    test(e) {
      e.preventDefault();
      const tests = [
        "015LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U",
        "algorand://025LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?&note=123",
        "algorand://035LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?&note=234&&",
        "algorand://045LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?xnote=345&fee=3&amount=1000&decimal-power=3&asset=456",
        "algorand://046LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?note=SGVsbG8=&noteB64=1&fee=0.001&amount=1",
      ];
      for (let index in tests) {
        console.log("testing", tests[index]);
        this.onDecodeQR(tests[index]);
        console.log(
          "result",
          tests[index],
          this.payTo,
          this.paynote,
          this.paynoteB64,
          this.payamount,
          this.fee,
          this.asset
        );
      }
    },
    onDecodeQR(result) {
      console.log("onDecodeQR", result);
      if (this.scan && result) {
        if (result.startsWith("algorand://")) {
          // parse according to https://github.com/emg110/algorand-qrcode
          result = result.replace("algorand://", "");
          const qIndex = result.indexOf("?");
          if (qIndex < 0) {
            this.payTo = result;
          } else {
            this.payTo = result.substring(0, qIndex);

            const params = result.substring(qIndex + 1);
            const paramsArr = params.split("&");

            let note = undefined;
            let noteB64 = undefined;
            let amount = undefined;
            let decimals = undefined;
            let asset = undefined;
            let fee = undefined;

            for (const index in paramsArr) {
              const eqIndex = paramsArr[index].indexOf("=");
              if (eqIndex > 0) {
                // valid parameter names starts with letters
                const paramName = paramsArr[index].substring(0, eqIndex);
                const paramValue = paramsArr[index].substring(eqIndex + 1);
                switch (paramName) {
                  case "note":
                  case "xnote":
                  case "label":
                    note = paramValue;
                    break;
                  case "noteB64":
                    noteB64 = paramValue;
                    break;
                  case "amount":
                    amount = paramValue;
                    break;
                  case "decimals":
                  case "decimal-power":
                    decimals = paramValue;
                    break;
                  case "asset":
                    asset = paramValue;
                    break;
                  case "fee":
                    fee = paramValue;
                    break;
                }
              }
            }

            this.paynote = note;
            this.paynoteB64 = !!noteB64;
            if (decimals !== undefined) {
              if (amount) {
                this.payamount = amount / Math.pow(10, decimals);
              }
              if (fee) {
                this.fee = fee / Math.pow(10, decimals);
              }
            } else {
              if (amount) {
                this.payamount = amount;
              }
              if (fee) {
                this.fee = fee;
              }
            }
            if (asset) {
              this.asset = asset;
            }
          }
        } else {
          this.payTo = result;
        }
      }
      console.log("onDecodeQR.out", result, this.payTo);
      if (this.payTo) {
        this.scan = false;
      }
    },
  },
};
</script>
