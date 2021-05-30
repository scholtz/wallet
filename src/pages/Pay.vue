<template>
  <main-layout>
    <form @submit="previewPaymentClick" v-if="page == 'design'">
      <h1>Make payment - from {{ account.name }}</h1>
      <p>Selected account: {{ account.addr }}</p>
      <div v-if="isMultisig && !subpage">
        <h2>Multisignature account</h2>
        <button class="btn btn-primary my-2" @click="subpage = 'proposal'">
          Create proposal
        </button>
        <button class="btn btn-primary m-2" @click="subpage = 'sign'">
          Sign &amp; sned proposal
        </button>
      </div>
      <div class="row" v-if="subpage == 'sign'">
        <div class="col-12">
          <p>Please enter signature from your friend here:</p>
          <textarea
            class="form-control my-2"
            v-model="rawSignedTxnInput"
            rows="8"
          ></textarea>

          <label>Sign with</label>
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
            Sign
          </button>
          <p v-if="rawSignedTxn">Send this data to other signators:</p>
          <textarea
            class="form-control my-2"
            v-if="rawSignedTxn"
            v-model="rawSignedTxn"
            rows="8"
          ></textarea>
          <button
            class="btn btn-primary my-2"
            @click="signMultisig"
            :disabled="signMultisigWith.length == 0"
          >
            Sign
          </button>
        </div>
      </div>
      <div class="row" v-if="showDesignScreen">
        <div class="col-12">
          <ul class="nav nav-tabs">
            <li class="nav-item">
              <a
                class="nav-link"
                :class="genericaccount ? '' : 'active'"
                @click="genericaccount = false"
                href="#"
                >Pay to wallet account</a
              >
            </li>
            <li class="nav-item">
              <a
                class="nav-link"
                :class="genericaccount ? 'active' : ''"
                @click="genericaccount = true"
                href="#"
                >Pay to other account</a
              >
            </li>
          </ul>

          <input
            v-if="genericaccount"
            v-model="payto"
            id="payto"
            class="form-control"
          />
          <select class="form-control" v-model="payto" v-if="!genericaccount">
            <option
              v-for="option in $store.state.wallet.privateAccounts"
              :key="option.addr"
              :value="option.addr"
            >
              {{ option.name + "  - " + option.addr }}
            </option>
          </select>
          <p v-if="genericaccount">
            It is better to store tha account to which you are sending money in
            the address book
          </p>

          <label for="payamount">Amount</label>
          <input
            v-model="payamount"
            id="payamount"
            type="number"
            min="0"
            max="99999999"
            step="0.000001"
            class="form-control"
          />
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

          <label for="paynote">Note</label>
          <input v-model="paynote" id="paynote" class="form-control" />

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
    </form>
    <form @submit="payPaymentClick" v-if="page == 'review'">
      <h1>Review payment</h1>
      <p>Please review your payment</p>
      <table class="table">
        <tr>
          <th>From account:</th>
          <td>{{ $route.params.account }}</td>
        </tr>
        <tr>
          <th>Pay to account:</th>
          <td>{{ payto }}</td>
        </tr>
        <tr>
          <th>Note:</th>
          <td>{{ paynote }}</td>
        </tr>
        <tr>
          <th>Amount:</th>
          <td>{{ $filters.formatCurrency(amountLong) }}</td>
        </tr>
        <tr>
          <th>Fee:</th>
          <td>{{ $filters.formatCurrency(feeLong) }}</td>
        </tr>
        <tr>
          <th>Total:</th>
          <td>{{ $filters.formatCurrency(amountLong + feeLong) }}</td>
        </tr>
      </table>
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
      <p v-if="!tx && processing" class="alert alert-primary my-2">
        <span
          class="spinner-grow spinner-grow-sm"
          role="status"
          aria-hidden="true"
        ></span>
        Sending payment to to the network
      </p>
      <p v-if="tx && !confirmedRound" class="alert alert-primary my-2">
        <span
          class="spinner-grow spinner-grow-sm"
          role="status"
          aria-hidden="true"
        ></span>
        Payment sent to the network. Tx: {{ tx }}. Waiting for network
        confirmation.
      </p>
      <p v-if="confirmedRound" class="alert alert-success my-2">
        Confirmation has been received. Your payment is in the block
        <b>{{ confirmedRound }}</b
        >. Transaction: {{ tx }}.
      </p>
      <textarea
        class="form-control my-2"
        v-if="txn"
        v-model="txn"
        rows="5"
      ></textarea>
      <div
        v-if="txn && accountsFromMultisig && accountsFromMultisig.length > 0"
      >
        <label>Sign with</label>
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
          Sign
        </button>
        <p v-if="rawSignedTxn">Send this data to other signators:</p>
        <textarea
          class="form-control my-2"
          v-if="rawSignedTxn"
          v-model="rawSignedTxn"
          rows="8"
        ></textarea>
      </div>
      <p v-if="error" class="alert alert-danger my-2">Error: {{ error }}</p>
    </form>
  </main-layout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
import algosdk from "algosdk";
export default {
  components: {
    MainLayout,
  },
  data() {
    return {
      genericaccount: false,
      payamount: 0,
      fee: 0.001,
      payto: "",
      paynote: "",
      page: "design",
      tx: "",
      processing: false,
      error: "",
      confirmation: null,
      confirmedRound: null,
      subpage: "",
      txn: null,
      rawSignedTxn: null,
      signMultisigWith: [],
    };
  },
  computed: {
    isNotValid() {
      if (!this.payto) return true;
      return false;
    },
    amountLong() {
      return this.payamount * 1000000;
    },
    feeLong() {
      return this.fee * 1000000;
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
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
  },
  mounted() {
    this.payto = this.$store.state.wallet.lastPayTo;
    this.lastActiveAccount({ addr: this.$route.params.account });
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      makePayment: "algod/makePayment",
      waitForConfirmation: "algod/waitForConfirmation",
      lastActiveAccount: "wallet/lastActiveAccount",
      getTransactionParams: "algod/getTransactionParams",
      getSK: "wallet/getSK",
    }),
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
    async signMultisig() {
      let rawSignedTxn = null;
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
            this.txn,
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
      this.rawSignedTxn = rawSignedTxn;
      this.rawSignedTxnInput = rawSignedTxn;
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
    async payPaymentClick(e) {
      e.preventDefault();
      try {
        if (this.isMultisig) return this.payMultisig();
        this.reset();
        this.prolong();
        const payTo = this.payto;
        const payFrom = this.$route.params.account;
        const amount = this.amountLong;
        const note = this.paynote;
        const fee = this.feeLong;
        console.log("sending payment", { payTo, payFrom, amount, note, fee });
        this.tx = await this.makePayment({ payTo, payFrom, amount, note, fee });
        const confirmation = await this.waitForConfirmation({
          txId: this.tx,
          timeout: 4,
        });
        if (!confirmation) {
          this.processing = false;
          this.error =
            "Payment has probably not reached the network. Are you offline? Please check you account";
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
  },
};
</script>