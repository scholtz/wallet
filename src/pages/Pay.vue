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
        <h1>
          {{ $t("pay.title") }} <span v-if="account">{{ account.name }}</span>
        </h1>
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
                v-if="!payTo"
                v-model="$route.params.toAccount"
                id="payTo1"
                disabled
                class="form-control"
              />
              <input
                v-else
                v-model="payTo"
                id="payTo2"
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
            <div class="alert alert-danger my-2" v-if="forcedAssetNotLoaded">
              It seems that desired asset has failed to load
            </div>
            <div>
              <label for="asset">{{ $t("pay.asset") }}</label>
              <input
                v-model="assetObj.name"
                v-if="forceAsset && assetObj && assetObj.name"
                class="form-control"
                disabled
              />
              <select id="asset" class="form-control" v-model="asset" v-else>
                <option
                  v-for="assetInfo in assets"
                  :key="assetInfo['asset-id']"
                  :value="assetInfo['asset-id']"
                >
                  {{ assetInfo["name"] }} ({{
                    $filters.formatCurrency(
                      assetInfo["amount"],
                      assetInfo["name"],
                      assetInfo["decimals"]
                    )
                  }})
                </option>
              </select>
            </div>
            <div class="alert alert-danger my-2" v-if="payamountGtMaxAmount">
              It seems your balance is below desired pay amount
            </div>
            <div>
              <label for="payamount" class="">{{ $t("pay.amount") }}</label>
              <div class="input-group">
                <input
                  v-model="payamount"
                  id="payamount"
                  type="number"
                  min="0"
                  :max="maxAmount"
                  :step="stepAmount"
                  class="form-control"
                />
                <input
                  v-if="assetUnit"
                  disabled
                  :value="assetUnit"
                  class="col-2"
                />
                <button
                  class="col-2 btn btn-outline-secondary"
                  @click="setMaxAmount"
                >
                  {{ $t("pay.set_max") }}
                </button>
              </div>
            </div>
            <div>
              <label for="fee">Fee</label>
              <div class="input-group">
                <input
                  v-model="fee"
                  id="fee"
                  type="number"
                  min="0.001"
                  max="1"
                  step="0.001"
                  class="form-control"
                />
                <input disabled value="Algo" class="col-4" />
              </div>
            </div>
            <div>
              <label for="paynote">{{ $t("pay.note") }}</label>
              <input v-model="paynote" id="paynote" class="form-control" />
            </div>

            <div class="form-check m-1" v-if="noteIsB64">
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

            <div>
              <label for="env">Environment</label>
              <input
                :value="$store.state.config.env"
                id="env"
                class="form-control"
                disabled
              />
            </div>
            <div>
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
          </div>

          <div v-if="scan" class="col-4">
            <QrcodeStream @decode="onDecodeQR" />
          </div>
        </div>
      </form>
      <form @submit="payPaymentClick" v-if="page == 'review'">
        <h1>{{ $t("pay.review_payment") }}</h1>
        <p>{{ $t("pay.review_payment_help") }}</p>
        <table class="w-100" v-if="!multisigDecoded.txn">
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
            <th>Environment:</th>
            <td>{{ $store.state.config.env }}</td>
          </tr>
          <tr v-if="this.assetObj">
            <th>{{ $t("optin.assetId") }}:</th>
            <td>{{ this.assetObj["asset-id"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("pay.amount") }}:</th>
            <td v-if="this.assetObj">
              {{
                $filters.formatCurrency(
                  amountLong,
                  this.assetObj.name,
                  this.assetObj.decimals
                )
              }}
            </td>
            <td v-else>
              {{ $filters.formatCurrency(amountLong) }}
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
          <table class="w-100">
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
          <table class="w-100">
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
import aprotocol from "../shared/algorand-protocol-parse";

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
      forceAsset: false,
    };
  },
  computed: {
    isNotValid() {
      if (!this.payTo) return true;
      return false;
    },
    amountLong() {
      return this.payamount * this.decimalsPower;
    },
    decimalsPower() {
      let decimals = 6;
      if (this.assetObj && this.assetObj.decimals !== undefined) {
        decimals = this.assetObj.decimals;
      }
      return Math.pow(10, decimals);
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
    selectedAssetFromAccount() {
      return this.account["assets"].find((a) => a["asset-id"] == this.asset);
    },
    maxAmount() {
      if (!this.account) return 0;

      if (this.asset) {
        if (!this.selectedAssetFromAccount) return 0;
        return this.selectedAssetFromAccount.amount / this.decimalsPower;
      } else {
        let ret = this.account.amount / 1000000 - 0.1;
        ret = ret - this.fee;
        if (this.account["assets"] && this.account["assets"].length > 0)
          ret = ret - this.account["assets"].length * 0.1;
        return ret;
      }
    },
    payamountGtMaxAmount() {
      return this.payamount > this.maxAmount;
    },
    forcedAssetNotLoaded() {
      return this.forceAsset && (!this.assetObj || !this.assetObj.name);
    },
    stepAmount() {
      if (!this.asset) return 0.000001;
      if (!this.account) return 0.000001;
      if (!this.assetObj || this.assetObj.decimals === undefined)
        return 0.000001;
      return Math.pow(10, -1 * this.assetObj.decimals);
    },
    noteIsB64() {
      if (!this.paynote) return false;
      return this.isBase64(this.paynote);
    },
    assetUnit() {
      if (!this.assetObj) return "";
      if (!this.assetObj["unit-name"]) return "";
      return this.assetObj["unit-name"];
    },
    isAuth() {
      return this.$store.state.wallet.isOpen;
    },
  },
  watch: {
    payamount() {
      /*
      console.log(
        "this.stepAmount",
        this.stepAmount,
        this.assetObj,
        this.account["assets"]
      );
      */
    },
    account() {
      console.log("account changed ", this.account);
      this.makeAssets();
    },
    async asset() {
      if (!this.asset) {
        this.assetObj = {
          "asset-id": undefined,
          name: "ALGO",
          "unit-name": "Algo",
          decimals: 6,
        };
      } else {
        this.assetObj = await this.getAsset({
          assetIndex: this.asset,
        });
      }
      console.log("assetObj", this.assetObj);
      this.payamount = 0;
      if (this.$route.params.toAccount) {
        this.parseToAccount();
      }
    },
    isAuth() {
      if (this.isAuth) {
        if (
          this.$store.state.wallet.privateAccounts &&
          this.$store.state.wallet.privateAccounts.length == 1
        ) {
          this.payFromDirect = this.$store.state.wallet.privateAccounts[0].addr;
        }
      }
    },
  },
  async mounted() {
    if (!this.payFrom) {
      this.setNoRedirect();
    }

    this.payTo = this.$store.state.wallet.lastpayTo;

    if (this.$route.params.toAccount) {
      this.parseToAccount();
    }

    if (this.$route.params.account) {
      this.lastActiveAccount({ addr: this.$route.params.account });
    }
    console.log("account", this.account);
    await this.makeAssets();

    if (
      this.$store.state.wallet.privateAccounts &&
      this.$store.state.wallet.privateAccounts.length == 1
    ) {
      this.payFromDirect = this.$store.state.wallet.privateAccounts[0].addr;
    }
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
      setEnv: "config/setEnv",
    }),
    isBase64(str) {
      try {
        const decoded1 = Buffer.from(str, "base64").toString("utf8");
        const encoded2 = Buffer.from(decoded1, "binary").toString("base64");
        return str == encoded2;
      } catch {
        return false;
      }
    },
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
          } else {
            console.log(
              "Asset not loaded",
              this.account.assets[index]["asset-id"]
            );
          }
        }
      }
      console.log("this.assets", this.assets);

      if (this.$route.params.toAccount) {
        this.parseToAccount();
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
    parseToAccount() {
      this.b64decode = aprotocol.parseAlgorandProtocolParameters(
        this.$route.params.toAccount
      );
      this.payTo = this.b64decode.payTo;
      this.payamount = this.b64decode.payamountbase / this.decimalsPower;
      if (this.b64decode.asset) {
        this.asset = this.b64decode.asset;
        this.forceAsset = true;
      }
      if (this.b64decode.paynote) {
        this.paynote = this.b64decode.paynote;
      }
      if (this.b64decode.fee) {
        this.fee = this.b64decode.fee;
      }
      if (this.b64decode.network != this.$store.state.config.env) {
        this.setEnv({ env: this.b64decode.network });
      }
    },
    previewPaymentClick(e) {
      this.page = "review";
      this.error = "";
      this.confirmedRound = "";
      this.tx = null;

      this.processing = false;
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
        if (!this.tx) {
          console.error("this.makePayment has failed");
          this.processing = false;
          this.error = this.$t("pay.state_error_not_sent");
          //            "Payment has probably not reached the network. Are you offline? Please check you account";
          return;
        }
        const confirmation = await this.waitForConfirmation({
          txId: this.tx,
          timeout: 4,
        });
        if (!confirmation) {
          console.error(`confirmation not received for this.tx`);
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
        "algorand://045LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?xnote=345&fee=3&amount=1000&asset=456",
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
    isEncoded(uri) {
      uri = uri || "";
      return uri !== decodeURIComponent(uri);
    },
    onDecodeQR(result) {
      console.log("onDecodeQR", result);
      if (this.scan && result) {
        if (
          result.startsWith("algorand://") ||
          result.startsWith("web+algorand://")
        ) {
          // parse according to https://github.com/emg110/algorand-qrcode
          result = result.replace("web+algorand://", "");
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
            if (this.isEncoded(this.paynote)) {
              this.paynote = decodeURIComponent(this.paynote);
            }

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
    setMaxAmount(e) {
      e.preventDefault();
      this.payamount = this.maxAmount;
    },
  },
};
</script>
