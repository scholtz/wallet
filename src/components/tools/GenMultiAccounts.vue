<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <h1>Generate multiple accounts</h1>
        <div class="m-1">
          <label for="amount">How many accounts you want to generate?</label>
          <div class="input-group">
            <input
              id="amount"
              v-model="amount"
              type="number"
              min="1"
              max="10000"
              step="1"
              class="form-control"
              rows="6"
            />
          </div>
        </div>
        <div class="m-1">
          <button class="btn btn-primary" @click="generate">
            Create {{ amount }} accounts
          </button>
        </div>
        <div v-if="results" class="m-1">
          <p>
            Please copy the content in the textarea to password protected area,
            for example encrypted excel file. If this data will be stolen from
            you, anybody can do algo transactions on your behalf. If you loose
            this data, your algos on these accounts will be lost forever.
          </p>
          <label for="results">Results</label>
          <textarea
            id="results"
            v-model="results"
            class="form-control"
            rows="20"
          />
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
      console.log("generating accounts");
      for (let index = 0; index < this.amount; index++) {
        let account = algosdk.generateAccount();
        console.log(account.addr);
        this.results +=
          algosdk.secretKeyToMnemonic(account.sk) + " " + account.addr + "\n";
      }
      console.log(this.results);
    },
  },
};
</script>
