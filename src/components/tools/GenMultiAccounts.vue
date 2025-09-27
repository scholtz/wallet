<template>
  <div class="grid">
    <div class="col-12">
      <h1>{{ $t("tools.generate_accounts_title") }}</h1>

      <div class="field grid">
        <label for="amount" class="col-12 mb-2 md:col-2 md:mb-0">
          How many accounts you want to generate?
        </label>
        <div class="col-12 md:col-10">
          <InputNumber
            inputId="amount"
            v-model="amount"
            :min="1"
            :max="10000"
            :step="1"
            class="w-full"
            showButtons
          />
        </div>
      </div>

      <div class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0"> </label>
        <div class="col-12 md:col-10">
          <Button @click="generate"> Create {{ amount }} accounts </Button>
        </div>
      </div>

      <div class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0"> </label>
        <div class="col-12 md:col-10">
          <p>
            Please copy the content in the textarea to password protected area,
            for example encrypted excel file. If this data will be stolen from
            you, anybody can do algo transactions on your behalf. If you loose
            this data, your algos on these accounts will be lost forever.
          </p>
        </div>
      </div>

      <div class="field grid" v-if="results">
        <label
          for="results"
          class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
        >
          Results
        </label>
        <div class="col-12 md:col-10 vertical-align-top h-full">
          <Textarea id="results" v-model="results" class="w-full" rows="20" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import algosdk from "algosdk";
export default {
  data() {
    return {
      amount: 10,
      results: "",
    };
  },
  methods: {
    async generate() {
      this.results = "";
      for (let index = 0; index < this.amount; index++) {
        let account = algosdk.generateAccount();
        this.results +=
          algosdk.secretKeyToMnemonic(account.sk) + " " + account.addr + "\n";
      }
    },
  },
};
</script>
