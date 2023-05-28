<template>
  <MainLayout>
    <div v-if="loading || error">
      <div v-if="error" class="alert alert-danger">
        {{ error }}
      </div>
      <div v-else>
        <span
          class="spinner-grow spinner-grow-sm"
          role="status"
          aria-hidden="true"
        />
        {{ $t("global.loading") }}
      </div>
    </div>
    <div v-else>
      <VoteTopMenu current="ams01" />
      <VoteMenu current="tl" />
      <h1>{{ $t("votetl.title") }}</h1>
      <p>{{ $t("votetl.help1") }}</p>
      <div class="row">
        <div class="col-12">
          <label for="add">{{ $t("votetl.add") }}</label>
          <textarea id="add" v-model="add" rows="10" class="form-control" />
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <label for="remove">{{ $t("votetl.remove") }}</label>
          <textarea
            id="remove"
            v-model="remove"
            rows="10"
            class="form-control"
          />
        </div>
      </div>
      <div class="row my-2">
        <div class="col-12">
          <button class="btn btn-primary" @click="submitTL">
            {{
              $t("votetl.submit_text", {
                accountName: $store.state.wallet.lastActiveAccountName,
              })
            }}
          </button>
        </div>
      </div>
      <div class="row my-2">
        <div class="col-12">
          <code>{{ note }}</code>
        </div>
      </div>
      <p v-if="!tx && processing" class="alert alert-primary my-2">
        <span
          class="spinner-grow spinner-grow-sm"
          role="status"
          aria-hidden="true"
        />
        {{ $t("pay.state_sending") }}
      </p>
      <p v-if="tx && !confirmedRound" class="alert alert-primary my-2">
        <span
          class="spinner-grow spinner-grow-sm"
          role="status"
          aria-hidden="true"
        />
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
      <DataTable
        v-model:selection="selection"
        :value="tl"
        responsive-layout="scroll"
        selection-mode="single"
        :paginator="true"
        :rows="20"
      >
        <template #empty>
          {{
            $t("votetl.no_tl", {
              accountName: $store.state.wallet.lastActiveAccountName,
            })
          }}
        </template>
        <Column
          field="round"
          :header="$t('votetl.round')"
          :sortable="true"
        /><Column
          field="account"
          :header="$t('votetl.account')"
          :sortable="true"
        />
      </DataTable>
    </div>
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
  props: {
    question: String,
    selectedAnswer: Object,
  },
  data() {
    return {
      loading: false,
      selection: null,
      add: "",
      remove: "",
      tl: [],
      results: {},
      value2: 3,
      params: null,
      tx: null,
      processing: false,
      confirmedRound: null,
      error: "",
    };
  },
  computed: {
    note() {
      const data = {};
      const add = this.add.split("\n").filter((a) => this.validateAccount(a));
      if (add.length > 0) data.a = add;
      const remove = this.remove
        .split("\n")
        .filter((a) => this.validateAccount(a));
      if (remove.length > 0) data.r = remove;

      if (add.length == 0 && remove.length == 0) return "";
      return "avote-tl/v1:j" + JSON.stringify(data);
    },
    isASAVote() {
      if (!this.currentToken) return false;
      return parseInt(this.currentToken) > 0;
    },
    currentToken() {
      return this.$store.state.vote.assetId;
    },
  },
  watch: {
    async selection() {
      this.$emit("update:selectedAnswer", this.selection);
      this.prolong();
    },
  },

  async mounted() {
    this.prolong();
    await this.loadTableItems();
  },
  methods: {
    ...mapActions({
      searchForTokenTransactionsWithNoteAndAmountAndAccount:
        "indexer/searchForTokenTransactionsWithNoteAndAmountAndAccount",
      searchForTransactionsWithNoteAndAmountAndAccount:
        "indexer/searchForTransactionsWithNoteAndAmountAndAccount",
      openSuccess: "toast/openSuccess",
      makePayment: "algod/makePayment",
      getTransactionParams: "algod/getTransactionParams",
      waitForConfirmation: "algod/waitForConfirmation",
      prolong: "wallet/prolong",
    }),
    validateAccount(acc) {
      if (!acc) return false;
      if (acc.length == 58) {
        return true;
      }
    },
    async loadTableItems() {
      console.log("this.question", this.question);
      this.loading = true;
      this.params = await this.getTransactionParams();
      const search = "avote-tl/v1";
      let txs = null;
      if (this.isASAVote) {
        txs = await this.searchForTokenTransactionsWithNoteAndAmountAndAccount({
          note: search,
          amount: 705,
          account: "",
          assetId: this.currentToken,
        });
      } else {
        txs = await this.searchForTransactionsWithNoteAndAmountAndAccount({
          note: search,
          amount: 705,
          account: "",
        });
      }
      this.loading = false;
      let ret = {};
      if (txs && txs.transactions) {
        for (let index in txs.transactions) {
          const tx = txs.transactions[index];
          if (!tx["sender"]) continue;
          let note = "";
          if (this.isBase64(tx.note)) {
            note = atob(tx.note);
          }
          console.log("note", note);
          const searchWithJ = search + ":j";
          if (!note.startsWith(searchWithJ)) {
            continue;
          }
          note = note.replace(searchWithJ, "");
          console.log("note", note);
          let noteJson = {};
          try {
            noteJson = JSON.parse(note);
          } catch (e) {
            console.log("error parsing", tx);
            continue;
          }

          if (noteJson.a) {
            for (let index in noteJson.a) {
              ret[noteJson.a[index]] = tx["confirmed-round"];
            }
          }
          if (noteJson.r) {
            for (let index in noteJson.r) {
              if (ret[noteJson.r[index]] !== undefined) {
                delete ret[noteJson.r[index]];
              }
            }
          }
        }
      } else {
        this.error = "Error while loading data from the blockchain";
        console.log("no transactions found");
      }

      this.tl = [];
      for (let index in ret) {
        this.tl.push({ round: ret[index], account: index });
      }
    },
    isBase64(str) {
      if (!str) return false;
      if (str.trim() === "") {
        return false;
      }
      try {
        return btoa(atob(str)) == str;
      } catch (err) {
        return false;
      }
    },

    async submitTL(e) {
      this.prolong();
      e.preventDefault();
      try {
        const payTo = this.$store.state.wallet.lastActiveAccount;
        const payFrom = this.$store.state.wallet.lastActiveAccount;
        const amount = 705;
        const fee = 1000;
        let asset = null;
        if (this.isASAVote) asset = this.currentToken;
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
