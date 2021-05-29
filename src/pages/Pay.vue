<template>
  <main-layout>
    <form @submit="previewPaymentClick" v-if="page == 'design'">
      <h1>
        Make payment - from {{ this.$store.state.wallet.lastActiveAccountName }}
      </h1>
      <p>Selected account: {{ $route.params.account }}</p>
      <div class="row">
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
      <input class="btn btn-primary" type="submit" value="Process payment" />
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
      <p v-if="error" class="alert alert-danger my-2">Error: {{ error }}</p>
    </form>
  </main-layout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
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
    };
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
    }),
    previewPaymentClick(e) {
      this.page = "review";
      this.prolong();
      e.preventDefault();
    },
    async payPaymentClick(e) {
      e.preventDefault();
      try {
        this.error = "";
        this.confirmedRound = "";
        this.processing = true;
        this.page = "review";
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