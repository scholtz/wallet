<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <h1>Pay from multiple accounts at once</h1>
        <div class="m-1">
          <label for="accounts"
            >List of mnemonic phrases for governance accounts</label
          >
          <textarea
            v-model="accounts"
            id="accounts"
            class="form-control"
            rows="6"
          ></textarea>
        </div>
        <!--
        <div class="form-check m-1">
          <input
            class="form-check-input"
            type="checkbox"
            v-model="current"
            id="current"
          />
          <label class="form-check-label" for="current">
            Opt in with current balance minus 0.1 algo
          </label>
        </div>
        -->
        <div class="m-1" v-if="!current">
          <label for="amount">How much algo do you want to send?</label>
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
          <label for="sendTo">Sent to account</label>
          <input v-model="sendTo" id="sendTo" class="form-control" rows="6" />
        </div>
        <div class="m-1">
          <label for="note">Note field</label>
          <input v-model="note" id="note" class="form-control" rows="6" />
        </div>
        <div class="m-1">
          <div>
            <code class="m-1">{{ note }}</code>
          </div>
          <button
            class="btn btn-primary"
            :disabled="sending || !sendTo || sent"
            @click="send"
          >
            Send transactions
          </button>
          <div class="alert alert-success my-1" v-if="sent">
            Payments has been sent
          </div>
        </div>
        <div class="m-1" v-if="results">
          <label for="results">Results</label>
          <textarea
            v-model="results"
            id="results"
            class="form-control"
            rows="6"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import algosdk from "algosdk";
export default {
  mounted() {
    this.prolong();
  },
  data() {
    return {
      accounts: "",
      current: false,
      amount: 100,
      sending: false,
      sent: false,
      sendTo: "",
      note: "",
    };
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      makePayment: "algod/makePayment",
    }),
    async send() {
      if (
        !confirm(
          "Are you sure you want to pay from multiple accounts " +
            this.amount +
            " algo to account " +
            this.account +
            "?"
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
          if (words.length < 25) {
            this.results +=
              "Line does not conaint mnemonic phrase: " + line + "\n";
            continue;
          }
          let account = "";
          // mnemonic import
          let mn = "";
          for (let i = 0; i < 25; i++) {
            mn += words[i] + " ";
          }
          let secret = null;
          try {
            secret = algosdk.mnemonicToSecretKey(mn.trim());
            account = secret.addr;
          } catch (e) {
            this.results += "Mnemonic is invalid: " + line + "\n";
            console.log("e", arrayOfLines, words, mn, e);
            continue;
          }
          console.log("account", account);

          const enc = new TextEncoder();
          let noteEnc = enc.encode(this.note);
          let amount = Math.round(this.amount * 1000000);
          let payFrom = secret;
          let payTo = this.sendTo;
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
                  "payment from " +
                  payFrom.addr +
                  " to " +
                  payTo +
                  " sent in tx " +
                  r +
                  "\n";
              } else {
                this.results +=
                  "payment from " +
                  payFrom.addr +
                  " to " +
                  payTo +
                  " failed to be sent\n";
              }
              if (toSend == sent) {
                this.sending = false;
                this.sent = true;
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