<template>
  <div>
    <h1>{{ $t("tools.pay_multiple_title") }}</h1>
    <div v-if="current" class="field grid">
      <label for="payFromDirect" class="col-12 mb-2 md:col-2 md:mb-0">
        Select internal account from which you want to distribute algos
      </label>
      <div class="col-12 md:col-10">
        <SelectAccount
          itemId="payFromDirect"
          v-model="payFromDirect"
          class="w-full"
        ></SelectAccount>
      </div>
    </div>

    <div v-if="!current" class="field grid">
      <label for="fromAccount" class="col-12 mb-2 md:col-2 md:mb-0">
        Write mnemonic phrase of the account from which you want to distribute
        algos
      </label>
      <div class="col-12 md:col-10">
        <InputText id="fromAccount" v-model="fromAccount" class="w-full" />
      </div>
    </div>
    <div class="field grid">
      <label for="amount" class="col-12 mb-2 md:col-2 md:mb-0">
        How much algo do you want to send to each of the accounts?
      </label>
      <div class="col-12 md:col-10">
        <InputGroup>
          <InputNumber
            inputId="amount"
            v-model="amount"
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
      <label
        for="accounts"
        class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
      >
        List of accounts or list of mnemonic phrases for governance accounts
      </label>
      <div class="col-12 md:col-10">
        <Textarea id="accounts" v-model="accounts" class="w-full" rows="6" />
      </div>
    </div>
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <Button :disabled="sending" @click="send"> Send transactions </Button>
      </div>
    </div>
    <div v-if="results" class="field grid">
      <label
        class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
        for="results"
        >{{ $t("tools.results") }}</label
      >
      <div class="col-12 md:col-10">
        <Textarea id="results" v-model="results" class="w-full" rows="20" />
      </div>
    </div>
  </div>
</template>

<script>
import algosdk from "algosdk";
import { mapActions } from "vuex";
import SelectAccount from "../../components/SelectAccount.vue";
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
  components: { SelectAccount },
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
            } catch {
              this.results += "Mnemonic is invalid: " + line + "\n";
              continue;
            }
          } else {
            // acocunt
            account = line.trim();
          }

          const enc = new TextEncoder();

          let noteEnc = enc.encode("");
          let amount = Math.round(this.amount * 1000000);
          let payFrom = this.payFromDirect;
          let payTo = account;
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
                  "payment to " + payTo + " sent in tx " + r + "\n";
              } else {
                this.results += "payment to " + payTo + " failed to be sent\n";
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
