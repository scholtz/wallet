<template>
  <main-layout>
    <div class="container-fluid">
      <h1>New account</h1>
      <div v-if="page == 'new'">
        <button v-if="!w" class="btn btn-primary m-1" @click="createAccount">
          Create basic account
        </button>
        <button
          v-if="!w"
          class="btn btn-primary m-1"
          @click="page = 'importaccount'"
        >
          Import account
        </button>
        <button
          v-if="!w"
          class="btn btn-primary m-1"
          @click="page = 'multisigaccount'"
        >
          Create multisign account
        </button>
      </div>
      <div v-if="page == 'importaccount'">
        <p>Write down 25 word mnomenic phrase</p>
        <textarea class="form-control my-1" v-model="w" />

        <p>Internal account name</p>
        <input v-model="name" class="form-control" />

        <button class="btn btn-primary m-1" @click="importAccountClick">
          Create account
        </button>
        <button class="btn btn-light m-1" @click="reset">Go back</button>
      </div>
      <div v-if="page == 'multisigaccount'">
        <p>
          Multisignature account can process transactions only if N accounts
          listed at the account creation sign the transaction.
        </p>
        <p>Select existing accounts in your wallet:</p>
        <select
          class="select form-control"
          multiple
          rows="20"
          v-model="multisigaccts"
          style="min-height: 150px"
        >
          <option
            v-for="option in $store.state.wallet.privateAccounts"
            :key="option.addr"
          >
            {{ option.addr }}
          </option>
        </select>
        <p class="my-2">Add your friends accounts - one account per line:</p>
        <textarea
          class="form-control my-1"
          v-model="friendaccounts"
          style="min-height: 150px"
        />

        <p class="my-2">
          Select how many accounts are required to sign the transaction ({{
            multisignum
          }}/{{ countAccounts() }}):
        </p>
        <input
          type="range"
          class="form-range"
          min="1"
          :max="countAccounts()"
          v-model="multisignum"
          id="customRange2"
        />

        <input
          type="number"
          class="form-control"
          min="1"
          :max="countAccounts()"
          v-model="multisignum"
          id="customRange2"
        />

        <p>Internal account name</p>
        <input v-model="name" class="form-control" />

        <button class="btn btn-primary m-1" @click="createMultisignClick">
          Create account
        </button>
        <button class="btn btn-light m-1" @click="reset">Go back</button>
      </div>
      <div v-if="!this.s && page == 'newaccount'">
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
        <p>Internal account name</p>
        <input v-model="name" class="form-control" />
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
      <div v-if="this.s && !this.challange && page == 'newaccount'">
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
        <button v-if="this.s" class="btn btn-light m-1" @click="reset">
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
      page: "new",
      multisignum: 2,
      multisigaccts: [],
      friendaccounts: "",
      name: "",
    };
  },
  components: {
    MainLayout,
  },
  mounted() {
    this.reset();
  },
  methods: {
    ...mapActions({
      addPrivateAccount: "wallet/addPrivateAccount",
      addMultiAccount: "wallet/addMultiAccount",
      prolong: "wallet/prolong",
    }),
    reset() {
      this.name = "";
      this.page = "new";
      this.s = false;
      this.w = "";
      this.prolong();
    },
    createAccount() {
      console.log("this", this);
      this.page = "newaccount";
      let account = algosdk.generateAccount();
      this.a = account.addr;
      this.w = algosdk.secretKeyToMnemonic(account.sk);
    },
    makeRandom() {
      this.guess = "";
      this.challange = true;
      //this.r = Math.floor(Math.random() * 25) + 1;
      this.r = 1;
    },
    confirmCreate() {
      const that = this;
      const words = this.w.split(" ");
      if (words[this.r - 1] == this.guess.trim()) {
        this.addPrivateAccount({ mn: this.w, name: this.name }).then((r) => {
          if (r) {
            that.$router.push({ name: "Accounts" });
          }
        });
      } else {
        console.log("error");
      }
    },
    createMultisignClick() {
      const accounts = this.friendaccounts.split("\n");
      let accts = Array.from(this.multisigaccts);

      for (let index in accounts) {
        if (accounts[index].length == 58) {
          accts.push(accounts[index]);
        }
      }
      const mparams = {
        version: 1,
        threshold: this.multisignum,
        addrs: accts,
      };
      console.log("mparams", mparams, this.multisigaccts, accts);
      this.addMultiAccount({ params: mparams, name: this.name });
    },
    importAccountClick() {
      const that = this;
      this.addPrivateAccount({ mn: this.w, name: this.name }).then((r) => {
        if (r) {
          that.$router.push({ name: "Accounts" });
        }
      });
    },
    countAccounts() {
      const accounts = this.friendaccounts.split("\n");
      let ret = this.multisigaccts.length;
      for (let index in accounts) {
        if (accounts[index].length == 58) {
          ret++;
        }
      }
      return ret;
    },
  },
};
</script>