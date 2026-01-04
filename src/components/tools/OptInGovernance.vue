<template>
  <div class="container-fluid">
    <div class="grid">
      <div class="col-12">
        <h1>{{ $t("tools.opt_in_governance_title") }}</h1>
        <p>
          {{ $t("tools.opt_in_governance_help") }}
        </p>

        <div class="field grid">
          <label
            for="accounts"
            class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
          >
            List of mnemonic phrases for governance accounts
          </label>
          <div class="col-12 md:col-10">
            <Textarea
              id="accounts"
              v-model="accounts"
              class="w-full"
              rows="6"
            />
          </div>
        </div>

        <div v-if="!current" class="field grid">
          <label for="amount" class="col-12 mb-2 md:col-2 md:mb-0">
            How much algo do you want to allocate for governance each account?
          </label>
          <div class="col-12 md:col-10">
            <InputGroup>
              <InputNumber
                inputId="amount"
                v-model="amount"
                type="number"
                :min="0"
                :max="1999999999"
                :step="0.000001"
                :maxFractionDigits="6"
                class="w-full"
              />
              <InputGroupAddon>{{ $t("common.algo") }}</InputGroupAddon>
            </InputGroup>
          </div>
        </div>
        <div class="field grid">
          <label for="sendTo" class="col-12 mb-2 md:col-2 md:mb-0">
            Sent to account.
          </label>
          <div class="col-12 md:col-10">
            <InputText id="sendTo" v-model="sendTo" class="w-full" rows="6" />
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <div>
              <code>{{ note }}</code>
            </div>
            <Button :disabled="sending || !sendTo" @click="send">
              Send transactions
            </Button>
          </div>
        </div>
        <div v-if="results" class="field grid">
          <label
            for="results"
            class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
          >
            Results
          </label>
          <div class="col-12 md:col-10">
            <Textarea id="results" v-model="results" class="w-full" rows="6" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import algosdk from "algosdk";
export default {
  data() {
    return {
      accounts: "",
      current: false,
      amount: 100,
      sending: false,
      sendTo: "",
    };
  },
  computed: {
    note() {
      return 'af/gov1:j{"com":' + Math.round(this.amount * 1000000) + "}";
    },
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
          "Are you sure you want to opt in for governance with balance " +
            this.amount +
            " to account " +
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
          // mnemonic import
          let mn = "";
          for (let i = 0; i < 25; i++) {
            mn += words[i] + " ";
          }
          let secret = null;
          try {
            secret = algosdk.mnemonicToSecretKey(mn.trim());
          } catch {
            this.results += "Mnemonic is invalid: " + line + "\n";
            continue;
          }

          const enc = new TextEncoder();
          let noteEnc = enc.encode(this.note);
          let amount = 0;
          let payFrom = secret;
          let payTo = this.sendTo;
          let fee = 1000;
          let asset = null;
          toSend++;
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
              }
            });
          } catch (error) {
            console.error("error", error);
          }
        }
      }
    },
  },
};
</script>
