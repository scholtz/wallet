<template>
  <div>
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
      <DataTable
        v-model:selection="selection"
        :value="questions"
        responsive-layout="scroll"
        selection-mode="single"
        :paginator="true"
        :rows="20"
      >
        <template #empty>
          {{ $t("voteanswerslist.no_answers") }}
        </template>
        <Column
          field="round"
          :header="$t('voteanswerslist.round')"
          :sortable="true"
        />
        <Column
          field="round-time"
          :header="$t('voteanswerslist.time')"
          :sortable="true"
        >
          <template #body="slotProps">
            <div v-if="slotProps.column.props.field in slotProps.data">
              {{
                $filters.formatDateTime(
                  slotProps.data[slotProps.column.props.field]
                )
              }}
            </div>
          </template>
        </Column>
        <Column
          field="sender"
          :header="$t('voteanswerslist.sender')"
          :sortable="true"
          style-class="not-show-at-start"
        />
        <Column field="response" :header="$t('voteanswerslist.response')">
          <template #body="slotProps">
            <div v-if="slotProps.column.props.field in slotProps.data">
              {{ JSON.stringify(slotProps.data[slotProps.column.props.field]) }}
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
export default {
  props: {
    question: String,
    selectedAnswer: Object,
  },
  data() {
    return {
      loading: false,
      selection: null,
      questions: [],
      answers: [],
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
    async question() {
      if (!this.question) return;
      await this.loadTableItems();
    },
    currentToken() {
      this.loadTableItems();
    },
  },
  async mounted() {
    this.prolong();
    if (this.question) {
      await this.loadTableItems();
    }
  },
  methods: {
    ...mapActions({
      searchForTransactionsWithNoteAndAmount:
        "indexer/searchForTransactionsWithNoteAndAmount",
      searchForTokenTransactionsWithNoteAndAmount:
        "indexer/searchForTokenTransactionsWithNoteAndAmount",
      openSuccess: "toast/openSuccess",
      makePayment: "algod/makePayment",
      getTransactionParams: "algod/getTransactionParams",
      waitForConfirmation: "algod/waitForConfirmation",
      prolong: "wallet/prolong",
    }),
    async loadTableItems() {
      this.loading = true;
      this.params = await this.getTransactionParams();
      const search = "avote-vote/v1/" + this.question.substring(0, 10);
      let txs = null;
      if (this.isASAVote) {
        txs = await this.searchForTokenTransactionsWithNoteAndAmount({
          note: search,
          amount: 703,
          assetId: this.currentToken,
        });
      } else {
        txs = await this.searchForTransactionsWithNoteAndAmount({
          note: search,
          amount: 703,
          min: this.params.firstRound - 300000,
        });
      }
      this.loading = false;
      let latest = null;
      if (txs && txs.transactions) {
        for (let index in txs.transactions) {
          const tx = txs.transactions[index];
          if (!tx["sender"]) continue;
          let note = "";
          if (this.isBase64(tx.note)) {
            note = atob(tx.note);
          }
          const searchWithJ = search + ":j";
          if (!note.startsWith(searchWithJ)) {
            continue;
          }
          note = note.replace(searchWithJ, "");
          let noteJson = {};
          try {
            noteJson = JSON.parse(note);
          } catch (e) {
            console.error("error parsing", tx);
            continue;
          }
          const answ = {
            round: tx["confirmed-round"],
            "round-time": tx["round-time"],
            sender: tx["sender"],
            id: tx["id"],
            response: noteJson.a,
          };
          if (answ.sender == this.$store.state.wallet.lastActiveAccount) {
            if (!latest) latest = answ;
            if (latest.round < answ.round) latest = answ;
          }
          this.questions.push(answ);
        }
      } else {
        this.error = "Error while loading data from the blockchain";
        console.error("no transactions found");
      }
      if (latest) {
        latest.latest = true;
        this.$emit("update:selectedAnswer", latest);
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
  },
};
</script>
