<template>
  <MainLayout>
    <VoteTopMenu current="ams01" />
    <VoteMenu current="ask" />
    <form @submit="submitQuestion">
      <h1>
        {{ $t("voteask.title") }}
      </h1>

      <div class="row">
        <div class="col-12">
          <label for="title">{{ $t("voteask.question_title") }}</label>
          <input
            id="title"
            class="form-control my-2"
            v-model="title"
            rows="8"
            :placeholder="$t('voteask.title_placeholder')"
          />
        </div>
        <div class="col-12">
          <label for="question">{{ $t("voteask.question_text") }}</label>
          <textarea
            id="question"
            class="form-control my-2"
            v-model="question"
            rows="8"
          ></textarea>
        </div>

        <div class="col-12">
          <label for="url">{{ $t("voteask.url") }}</label>
          <input
            class="form-control my-2"
            v-model="url"
            rows="8"
            :placeholder="$t('voteask.url_placeholder')"
          />
        </div>
        <div class="col-12">
          <label for="duration">{{ $t("voteask.max_round") }}</label>
          <input
            id="duration"
            class="form-control my-2"
            min="1"
            max="9999999"
            step="1"
            type="number"
            v-model="duration"
          />
        </div>
        <div class="col-12">
          {{ $t("voteask.calculated_block") }}: {{ max_block }}
          {{ $t("voteask.calculated_time") }}: {{ max_blockTime }}
        </div>
        <p>{{ $t("voteask.responses_help") }}</p>
        <div class="row" v-for="(option, index) in options" :key="index">
          <div class="col-2">
            <input
              class="form-control my-2"
              v-model="option.code"
              :placeholder="$t('voteask.code')"
            />
          </div>
          <div class="col-9">
            <input
              class="form-control my-2"
              v-model="option.text"
              :placeholder="$t('voteask.response_text')"
            />
          </div>
          <div class="col-1">
            <button
              class="form-control my-2"
              @click="
                this.options = this.options.filter(function (item) {
                  return item !== option;
                })
              "
            >
              {{ $t("voteask.remove_response") }}
            </button>
          </div>
        </div>
        <div class="col-12">
          <button
            class="btn btn-light btn-xs btn-outline-primary"
            @click="addOption"
          >
            {{ $t("voteask.add_response") }}
          </button>
        </div>
        <div class="col-12">
          <label for="category">{{ $t("voteask.category") }}</label>
          <input
            id="category"
            class="form-control my-2"
            v-model="category"
            rows="8"
            :placeholder="$t('voteask.category_placeholder')"
          />
        </div>
        <div>
          {{ $store.state.wallet.lastActiveAccount }}
          <code>{{ note }}</code>
        </div>
        <div class="col-12">
          <input
            type="submit"
            :disabled="!note || processing"
            class="btn btn-primary my-2"
            @click="loadMultisig"
            :value="
              $t('voteask.submit_question', {
                accountName: $store.state.wallet.lastActiveAccountName,
              })
            "
          />
        </div>

        <p v-if="!tx && processing" class="alert alert-primary my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          ></span>
          {{ $t("pay.state_sending") }}
        </p>
        <p v-if="tx && !confirmedRound" class="alert alert-primary my-2">
          <span
            class="spinner-grow spinner-grow-sm"
            role="status"
            aria-hidden="true"
          ></span>
          {{ $t("pay.state_sent") }}: {{ tx }}.
          {{ $t("pay.state_waiting_confirm") }}
        </p>
        <p v-if="confirmedRound" class="alert alert-success my-2">
          {{ $t("pay.state_confirmed") }} <b>{{ confirmedRound }}</b
          >. {{ $t("pay.transaction") }}: {{ tx }}.
        </p>
        <p v-if="error" class="alert alert-danger my-2">
          {{ $t("pay.error") }}: {{ error }}
        </p>
      </div>
    </form>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import VoteMenu from "../../components/VoteMenu.vue";
import VoteTopMenu from "../../components/VoteTopMenu.vue";
import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
    VoteMenu,
    VoteTopMenu,
  },
  data() {
    return {
      title: "",
      question: "",
      url: "",
      category: "community",
      duration: 20000,
      paramsTime: null,
      params: null,
      tx: null,
      processing: false,
      confirmedRound: null,
      error: "",
      options: [
        { code: "", text: "" },
        { code: "", text: "" },
      ],
      advanced: false,
    };
  },
  computed: {
    accountsWithPrivateKey() {
      return this.$store.state.wallet.privateAccounts.filter((a) => !!a.sk);
    },
    hasPrivate() {
      return (
        this.accountsWithPrivateKey && this.accountsWithPrivateKey.length > 0
      );
    },
    note() {
      if (!this.title) return "";
      if (!this.question) return "";
      if (!this.category) return "";
      if (!this.duration) return "";

      let options = {};
      for (let index in this.options) {
        const option = this.options[index];

        if (option.code && option.text) {
          options[option.code] = option.text;
        }
      }
      if (Object.values(options).length == 0) return "";

      const json = {};
      json.t = this.title;
      json.q = this.question;
      json.duration = this.duration;
      json.category = this.category;
      if (this.url) {
        json.url = this.url;
      }
      json.o = options;
      return "avote-question/v2:j" + JSON.stringify(json);
    },
    max_block() {
      if (!this.params) return;
      console.log("this.params", this.params, this.params.firstRound);
      if (!this.params.firstRound) return;
      return parseInt(this.params.firstRound) + parseInt(this.duration);
    },
    max_blockTime() {
      if (!this.paramsTime) return;
      var t = new Date(this.paramsTime);
      t.setSeconds(t.getSeconds() + this.duration * 4.5);
      return t;
    },
  },
  async mounted() {
    console.log("accountsWithPrivateKey", this.accountsWithPrivateKey);
    this.prolong();
    this.params = await this.getTransactionParams();
    this.paramsTime = new Date();
    console.log("params", this.params);
  },
  methods: {
    ...mapActions({
      openSuccess: "toast/openSuccess",
      makePayment: "algod/makePayment",
      getTransactionParams: "algod/getTransactionParams",
      waitForConfirmation: "algod/waitForConfirmation",
      prolong: "wallet/prolong",
    }),
    addOption(e) {
      e.preventDefault();
      this.options.push({ code: "", text: "" });
    },
    async submitQuestion(e) {
      this.prolong();
      e.preventDefault();
      try {
        const payTo = this.$store.state.wallet.lastActiveAccount;
        const payFrom = this.$store.state.wallet.lastActiveAccount;
        const amount = 702;
        const fee = 1000;
        const asset = null;
        const enc = new TextEncoder();
        const note = this.note;
        if (!note) return;
        let noteEnc = enc.encode(note);
        console.log("sending payment", {
          payTo,
          payFrom,
          amount,
          noteEnc,
          fee,
          asset,
        });
        this.tx = await this.makePayment({
          payTo,
          payFrom,
          amount,
          noteEnc,
          fee,
          asset,
        });
        const confirmation = await this.waitForConfirmation({
          txId: this.tx,
          timeout: 4,
        });
        if (!confirmation) {
          this.processing = false;
          this.error = this.$t("pay.state_error_not_sent");
          //            "Payment has probably not reached the network. Are you offline? Please check you account";
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