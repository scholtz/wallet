<template>
  <main-layout>
    <h1>New account</h1>

    <button v-if="!w" class="btn btn-primary" @click="createAccount">
      Create account
    </button>
    <div v-else>
      <div v-if="!this.s">
        <p>
          In order to create account, make sure to backup mnomenic phrase. Is it
          safe to show the phrase now?
        </p>
        <button v-if="!this.s" class="btn btn-primary" @click="this.s = true">
          Show mnomenic
        </button>
      </div>
      <div v-if="this.s && this.challange">
        <p>What is word at position n. {{ r }}?</p>
        <input class="form-control" v-model="guess" />
        <button
          v-if="this.s"
          class="btn btn-primary m-1"
          @click="confirmCreate"
        >
          Create account
        </button>
        <button
          v-if="this.s"
          class="btn btn-primary m-1"
          @click="
            this.challange = false;
            this.s = false;
          "
        >
          Go back
        </button>
      </div>
      <div v-if="this.s && !this.challange">
        <p>
          Write the mnomenic words in displayed order down, copy or take a
          picture. Next step will be to confirm some of the words from this
          phrase and we will save it to the encrypted storage in your browser.
          It is safe to store this mnomenic and use this address without storing
          it to the account. Make sure never to lose the mnomenic phrase.
        </p>

        <textarea class="form-control my-1" v-model="w" />
        <input class="form-control my-1" v-model="a" />

        <button v-if="this.s" class="btn btn-primary m-1" @click="makeRandom">
          Start the challange
        </button>
        <button v-if="this.s" class="btn btn-light m-1" @click="createAccount">
          Create new
        </button>
        <button v-if="this.s" class="btn btn-light m-1" @click="this.s = false">
          Hide mnomenic
        </button>
        <button
          v-if="this.s"
          class="btn btn-light m-1"
          @click="
            this.s = false;
            this.w = '';
          "
        >
          Drop phrase
        </button>
      </div>
    </div>
  </main-layout>
</template><script>
import MainLayout from "../layouts/Main.vue";
import algosdk from "algosdk";
import { mapActions } from "vuex";

export default {
  data() {
    return {
      r: 0,
      a: "",
      w: "",
      guess: "",
      s: false,
      challange: false,
    };
  },
  components: {
    MainLayout,
  },
  mounted() {},
  methods: {
    ...mapActions({
      addPrivateAccount: "wallet/addPrivateAccount",
    }),
    createAccount() {
      let account = algosdk.generateAccount();
      this.a = account.addr;
      this.w = algosdk.secretKeyToMnemonic(account.sk);
    },
    makeRandom() {
      this.guess = "";
      this.challange = true;
      this.r = Math.floor(Math.random() * 25) + 1;
    },
    confirmCreate() {
      const words = this.w.split(" ");
      if (words[this.r - 1] == this.guess) {
        console.log("success");
        this.addPrivateAccount({ mn: this.w });
      } else {
        console.log("error");
      }
    },
  },
};
</script>