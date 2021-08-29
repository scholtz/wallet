<template>
  <MainLayout>
    <VoteMenu current="tl" />
    <div class="row">
      <div class="col-12">
        <label for="add"
          >Add accounts to trusted list - one account per line</label
        >
        <textarea v-model="add" id="add" rows="10" class="form-control">
        </textarea>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <label for="remove"
          >Remove accounts from trusted list - one account per line</label
        >
        <textarea v-model="remove" id="remove" rows="10" class="form-control">
        </textarea>
      </div>
    </div>
    <div class="row my-2">
      <div class="col-12">
        <button class="btn btn-primary">
          Store trusted list to blockchain
        </button>
      </div>
    </div>
    <div class="row my-2">
      <div class="col-12">
        <code>{{ note }}</code>
      </div>
    </div>
    <DataTable
      :value="questions"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
      :paginator="true"
      :rows="20"
    >
      <template #empty> {{ $t("acc_overview.no_answers") }} </template>
      <Column
        field="round"
        :header="$t('voteanswer.round')"
        :sortable="true"
      ></Column>
      <Column
        field="round-time"
        :header="$t('acc_overview.time')"
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
        :header="$t('acc_overview.sender')"
        :sortable="true"
        styleClass="not-show-at-start"
      ></Column>
      <Column field="response" :header="$t('voteanswer.response')">
        <template #body="slotProps">
          <div v-if="slotProps.column.props.field in slotProps.data">
            {{ JSON.stringify(slotProps.data[slotProps.column.props.field]) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import VoteMenu from "../../components/VoteMenu.vue";
import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
    VoteMenu,
  },
  props: {
    question: String,
    selectedAnswer: Object,
  },
  data() {
    return {
      selection: null,
      add: "",
      remove: "",
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
  watch: {
    async selection() {
      this.$emit("update:selectedAnswer", this.selection);
      this.prolong();
    },
    async question() {
      if (!this.question) return;
      await this.loadTableItems();
    },
  },
  computed: {
    note() {
      const data = {};
      data.a = this.add.split("\n").filter((a) => this.validateAccount(a));
      data.r = this.remove.split("\n").filter((a) => this.validateAccount(a));
      return "avote-tl/v1:j" + JSON.stringify(data);
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
      this.params = await this.getTransactionParams();
      const search = "avote-vote/v1/" + this.question.substring(0, 10);
      const txs = await this.searchForTransactionsWithNoteAndAmount({
        note: search,
        amount: 703,
      });
      let latest = null;
      if (txs.transactions) {
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
          console.log("noteJson", noteJson);
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
        console.log("no transactions found");
      }
      if (latest) {
        latest.latest = true;
        this.$emit("update:selectedAnswer", latest);
      }
      console.log("txs", txs, this.questions);
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
