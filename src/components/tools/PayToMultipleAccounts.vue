<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <h1>Pay to multiple accounts from single account - Distribute algos</h1>
        <!--
        <div class="form-check m-1">
          <input
            class="form-check-input"
            type="checkbox"
            v-model="current"
            id="current"
          />
          <label class="form-check-label" for="current">
            Use internal account from which to distribute algos
          </label>
        </div>-->
        <div class="m-1" v-if="current">
          <label for="payFromDirect"
            >Select internal account from which you want to distribute
            algos</label
          >
          <select
            class="form-control"
            id="payFromDirect"
            v-model="payFromDirect"
          >
            <option
              v-for="option in $store.state.wallet.privateAccounts"
              :key="option.addr"
              :value="option.addr"
            >
              {{ option.name + "  - " + option.addr }}
            </option>
          </select>
        </div>

        <div class="m-1" v-if="!current">
          <label for="fromAccount"
            >Write mnemonic phrase of the account from which you want to
            distribute algos</label
          >
          <div class="input-group">
            <input
              id="fromAccount"
              class="form-control"
              v-model="fromAccount"
            />
          </div>
        </div>
        <div class="m-1">
          <label for="amount"
            >How much algo do you want to send to each of the accounts?</label
          >
          <div class="input-group">
            <input
              v-model="amount"
              type="number"
              min="0"
              max="1999999999"
              step="0.000001"
              id="amount"
              class="form-control"
              rows="6"
            />
            <span class="input-group-text">Algo</span>
          </div>
        </div>
        <div class="m-1">
          <label for="accounts"
            >List of accounts or list of mnemonic phrases for governance
            accounts</label
          >
          <textarea
            v-model="accounts"
            id="accounts"
            class="form-control"
            rows="6"
          ></textarea>
        </div>
      </div>
      <div class="m-1">
        <button class="btn btn-primary" :disabled="sending" @click="send">
          Send transactions
        </button>
      </div>
      <div class="m-1" v-if="results">
        <label for="results">Results</label>
        <textarea
          v-model="results"
          id="results"
          class="form-control"
          rows="20"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script>
import algosdk from "algosdk";
import { mapActions } from "vuex";

export default {
  data() {
    return {
      current: true,
      payFromDirect: "",
      fromAccount: "",
      accounts: "",
      amount: 1,
      sending: false,
      results: "",
    };
  },
  mounted() {
    this.prolong();
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      makePayment: "algod/makePayment",
    }),
    async send() {
      if (
        !confirm(
          "Are you sure you want to pay from the selected account to multiple accounts " +
            this.amount +
            " algo?"
        )
      ) {
        return;
      }
      this.sending = true;
      this.results = "";
      let toSend = 0;
      let sent = 0;
      const arrayOfLines = this.accounts.split(/\r?\n/);
      for (let index in arrayOfLines) {
        const line = arrayOfLines[index];

        if (line) {
          const words = line.split(/ /);
          if (words.length > 1 && words.length < 25) {
            this.results +=
              "Line does not conaint mnemonic phrase: " + line + "\n";
            continue;
          }
          let account = "";
          if (words.length > 1) {
            // mnemonic import
            let mn = "";
            for (let i = 0; i < 25; i++) {
              mn += words[i] + " ";
            }
            try {
              const secret = algosdk.mnemonicToSecretKey(mn.trim());
              account = secret.addr;
            } catch (e) {
              this.results += "Mnemonic is invalid: " + line + "\n";
              console.log("e", arrayOfLines, words, mn, e);
              continue;
            }
          } else {
            // acocunt
            account = line.trim();
          }
          console.log("account", account);

          const enc = new TextEncoder();

          let noteEnc = enc.encode("");
          let amount = Math.round(this.amount * 1000000);
          let payFrom = this.payFromDirect;
          let payTo = account;
          let fee = 1000;
          let asset = null;
          toSend++;
          console.log("topay", {
            payTo,
            payFrom,
            amount,
            noteEnc,
            fee,
            asset,
          });
          try {
            this.makePayment({
              payTo,
              payFrom,
              amount,
              noteEnc,
              fee,
              asset,
            }).then((r) => {
              sent++;
              if (r) {
                this.results +=
                  "payment to " + payTo + " sent in tx " + r + "\n";
              } else {
                this.results += "payment to " + payTo + " failed to be sent\n";
              }
              if (toSend == sent) {
                this.sending = false;
              }
            });
          } catch (e) {
            console.log("error", e);
          }
        }
      }
    },
  },
};
</script>