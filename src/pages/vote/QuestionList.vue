<template>
  <div>
    <DataTable
      v-if="!selection"
      :value="questions"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
      :paginator="true"
      :rows="20"
    >
      <template #empty> {{ $t("acc_overview.no_questions") }} </template>
      <Column
        field="note.t"
        :header="$t('votequestion.title')"
        :sortable="true"
      ></Column>
      <Column
        field="round"
        :header="$t('votequestion.round')"
        :sortable="true"
      ></Column>
      <Column
        field="note.max"
        :header="$t('votequestion.maxround')"
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
        field="note.category"
        :header="$t('votequestion.category')"
        :sortable="true"
      ></Column>
      <Column
        field="sender"
        :header="$t('acc_overview.sender')"
        :sortable="true"
        styleClass="not-show-at-start"
      ></Column>
    </DataTable>
    <div v-if="selection">
      <button
        class="btn btn-xs btn-default btn-outline-primary"
        @click="this.selection = null"
      >
        List all questions
      </button>
      <table class="table">
        <tr>
          <th>Question id:</th>
          <td>{{ this.selection["id"] }}</td>
        </tr>
        <tr>
          <th>Round:</th>
          <td>{{ this.selection.round }}</td>
        </tr>
        <tr v-if="this.selection && this.selection.note">
          <th>Max voting round:</th>
          <td>{{ this.selection.note.max }}</td>
        </tr>
        <tr v-if="this.params">
          <th>Current round:</th>
          <td>{{ this.params.firstRound }}</td>
        </tr>
        <tr>
          <th>Time of the round:</th>
          <td>
            {{ $filters.formatDateTime(this.selection["round-time"]) }}
          </td>
        </tr>
        <tr>
          <th>Questionaree:</th>
          <td>{{ this.selection["sender"] }}</td>
        </tr>
        <tr>
          <th>Title:</th>
          <td>{{ this.selection.note.t }}</td>
        </tr>
        <tr>
          <th>Question:</th>
          <td>{{ this.selection.note.q }}</td>
        </tr>
        <tr>
          <th>Category:</th>
          <td>{{ this.selection.note["category"] }}</td>
        </tr>
        <tr>
          <th>Url:</th>
          <td>{{ this.selection.note["url"] }}</td>
        </tr>
        <tr>
          <th>Options:</th>
          <td>
            <div v-for="(o, index) in this.selection.note.o" :key="index">
              <div class="row">
                <div class="col-3">
                  <label :for="'R' + index">
                    {{ o }}
                  </label>
                </div>
                <div
                  class="col-9"
                  v-if="
                    !votingFinished || (selectedAnswer && selectedAnswer.latest)
                  "
                >
                  <InputText
                    :id="'R' + index"
                    class="w1"
                    v-model.number="results[index]"
                    style="width: 14rem"
                    :disabled="votingFinished"
                  />
                  <Slider
                    class="w1"
                    v-model="results[index]"
                    style="width: 14rem"
                    :disabled="votingFinished"
                  />
                  <div class="m-2">
                    {{ $filters.formatPercent(results[index] / sum) }}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <th></th>
          <td>
            <div v-if="votingFinished" class="alert alert-danger">
              Voting has been closed
            </div>
            <div
              v-if="selectedAnswer && selectedAnswer.latest"
              class="alert alert-success"
            >
              Latest vote for the account
              {{ $store.state.wallet.lastActiveAccountName }} is selected
            </div>

            <button
              v-if="!votingFinished"
              class="btn btn-primary bg-primary"
              :disabled="
                !canVote ||
                processing ||
                (selectedAnswer && selectedAnswer.latest)
              "
              @click="submitVote"
            >
              Vote with account {{ $store.state.wallet.lastActiveAccountName }}
            </button>
            <button
              v-if="votingFinished"
              class="btn btn-primary bg-primary"
              @click="checkResults"
            >
              Check results
            </button>
            <div v-if="canVote">
              <code>{{ note }}</code>
            </div>
          </td>
        </tr>
      </table>

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
      <div v-if="!votingFinished">
        If you want to vote, select your preferences please. You can assign your
        preferences for each answer with rating from zero to 100 points. If you
        want to select only one answer, please give it 100 points, and other
        answers to zero points. If you do not know, you do not have to vote, or
        you can assign all answers the equal number of points. If you vote for
        one answer in 100 points, and other answer 20 points, your voting power
        for first answer will be 100/120 = 83% and voting power distribution for
        second answer will be 17%. If you assign all options 100 points, your
        voting power distribution will be the same as if you assign all options
        1 point.
      </div>
      <AnswersList
        v-if="selection && selection.id"
        :question="selection.id"
        v-model:selectedAnswer="selectedAnswer"
      />
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import AnswersList from "./AnswersList";
export default {
  components: {
    AnswersList,
  },
  data() {
    return {
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
      selectedAnswer: {},
      processingResults: false,
    };
  },
  watch: {
    async selection() {
      this.results = {};
      if (this.selection && this.selection.note && this.selection.note.o) {
        for (let index in this.selection.note.o) {
          this.results[index] = 0;
        }
      }
    },
    selectedAnswer() {
      if (this.selectedAnswer && this.selectedAnswer.response) {
        this.results = JSON.parse(JSON.stringify(this.selectedAnswer.response));
      }
    },
    sum() {
      if (this.selectedAnswer && this.selectedAnswer.latest) {
        let s = 0;
        for (let index in this.selectedAnswer.response) {
          s += this.selectedAnswer.response[index];
        }
        if (this.sum != s) {
          this.selectedAnswer.latest = false;
        }
      }
    },
    votingFinished() {
      console.log("votingFinished", this.votingFinished);
    },
  },
  computed: {
    votingFinished() {
      return (
        this.params &&
        this.params.firstRound &&
        this.selection &&
        this.selection.note &&
        this.selection.note.max &&
        this.params.firstRound > this.selection.note.max
      );
    },
    sum() {
      let s = 0;
      for (let index in this.results) {
        s += this.results[index];
      }
      return s;
    },
    canVote() {
      return (
        !this.votingFinished &&
        this.params &&
        this.params.firstRound &&
        this.selection &&
        this.selection.note &&
        this.sum > 0
      );
    },
    note() {
      if (!this.selection) return "";
      if (!this.selection.note) return "";

      const json = {};
      json.q = this.selection.id;
      json.a = this.results;
      return (
        "avote-vote/v1/" +
        this.selection.id.substr(0, 10) +
        ":j" +
        JSON.stringify(json)
      );
    },
  },
  async mounted() {
    this.prolong();
    this.params = await this.getTransactionParams();
    const txs = await this.searchForTransactionsWithNoteAndAmount({
      note: "avote-question/v1:",
      amount: 702,
    });
    if (txs.transactions) {
      for (let index in txs.transactions) {
        const tx = txs.transactions[index];
        if (!tx["sender"]) continue;
        let note = "";
        if (this.isBase64(tx.note)) {
          note = atob(tx.note);
        }
        if (!note.startsWith("avote-question/v1:j")) {
          continue;
        }
        note = note.replace("avote-question/v1:j", "");
        const noteJson = JSON.parse(note);
        console.log("noteJson", noteJson);

        this.questions.push({
          round: tx["confirmed-round"],
          "round-time": tx["round-time"],
          sender: tx["sender"],
          id: tx["id"],
          note: noteJson,
        });
      }
    } else {
      console.log("no transactions found");
    }
    console.log("txs", txs, this.questions);
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
      axiosGet: "axios/get",
    }),

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
    async createAsset(e) {
      e.preventDefault();
      console.log("asset", this.asset);
      const asset = await this.makeAssetCreateTxnWithSuggestedParams({
        asset: this.asset,
      });
      if (asset.txId) {
        this.openSuccess("Asset request sent to the network: " + asset.txId);
      }
    },
    async submitVote(e) {
      this.prolong();
      e.preventDefault();
      try {
        const payTo = this.$store.state.wallet.lastActiveAccount;
        const payFrom = this.$store.state.wallet.lastActiveAccount;
        const amount = 703;
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
    async checkResults() {
      this.prolong();
      this.processingResults = true;
      try {
        // get all answers
        const answersPerAccount = {};
        const search = "avote-vote/v1/" + this.selection.id.substring(0, 10);
        let txs = await this.searchForTransactionsWithNoteAndAmount({
          note: search,
          amount: 703,
        });

        if (txs.transactions) {
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
            console.log("note", note);
            let noteJson = {};
            try {
              noteJson = JSON.parse(note);
            } catch (e) {
              console.log("error parsing", tx);
              continue;
            }
            const answ = {
              round: tx["confirmed-round"],
              "round-time": tx["round-time"],
              sender: tx["sender"],
              id: tx["id"],
              response: noteJson.a,
            };

            if (answersPerAccount[answ.sender] === undefined) {
              answersPerAccount[answ.sender] = answ;
            } else {
              if (answersPerAccount[answ.sender].round < answ.round)
                answersPerAccount[answ.sender] = answ;
              if (
                answersPerAccount[answ.sender].round == answ.round &&
                answersPerAccount[answ.sender].id > answ.id
              ) {
                answersPerAccount[answ.sender] = answ;
              }
            }
          }
        } else {
          this.processingResults = false;
          console.log("no transactions found");
          return;
        }
        console.log("answersPerAccount", answersPerAccount);
        // calculate whole delegation tree
        const delegationPerAccount = {};
        const searchDeleg = "avote-delegation/v1";
        txs = await this.searchForTransactionsWithNoteAndAmount({
          note: searchDeleg,
          amount: 701,
        });
        if (txs && txs.transactions) {
          for (let index in txs.transactions) {
            const tx = txs.transactions[index];
            if (tx["sender"] != this.$store.state.wallet.lastActiveAccount)
              continue;
            let note = "";
            if (this.isBase64(tx.note)) {
              note = atob(tx.note);
            }
            const searchDelegWithJ = searchDeleg + ":j";
            if (!note.startsWith(searchDelegWithJ)) {
              continue;
            }
            note = note.replace(searchDelegWithJ, "");
            let noteJson = {};
            try {
              noteJson = JSON.parse(note);
            } catch (e) {
              console.log("error parsing", tx);
              continue;
            }
            let deleg = {};
            if (noteJson.d[this.selection.note.category] !== undefined) {
              deleg = noteJson.d[this.selection.note.category];
            } else if (noteJson.d["any"] !== undefined) {
              deleg = noteJson.d["any"];
            }
            const answ = {
              round: tx["confirmed-round"],
              sender: tx["sender"],
              id: tx["id"],
              d: deleg,
            };

            if (delegationPerAccount[answ.sender] === undefined) {
              delegationPerAccount[answ.sender] = answ;
            } else {
              if (delegationPerAccount[answ.sender].round < answ.round)
                delegationPerAccount[answ.sender] = answ;
              if (
                delegationPerAccount[answ.sender].round == answ.round &&
                delegationPerAccount[answ.sender].id > answ.id
              ) {
                delegationPerAccount[answ.sender] = answ;
              }
            }
          }
        } else {
          console.log("no transactions found");
        }
        console.log("delegationPerAccount", delegationPerAccount);
        const delegationsToAccount = {};
        for (let accFrom in delegationPerAccount) {
          for (let accTo in delegationPerAccount[accFrom].d) {
            if (delegationsToAccount[accTo] === undefined) {
              delegationsToAccount[accTo] = {};
              delegationsToAccount[accTo][accFrom] = true;
            } else {
              delegationsToAccount[accTo][accFrom] = true;
            }
          }
        }
        console.log("delegationsToAccount", delegationsToAccount);
        // first calculation - trusted accounts
        const accounts = await this.axiosGet({ url: "/trusted.json" });
        const trusted = {};
        for (let index in accounts) {
          trusted[accounts[index]] = true;
        }
        const totalResults = {};
        for (let index in this.selection.note.o) {
          totalResults[index] = 0;
        }
        const done = {};
        for (let account in answersPerAccount) {
          if (done[account] !== undefined) continue; // already processed
          let accResult = this.getAccountResult(
            account,
            delegationsToAccount,
            delegationPerAccount,
            answersPerAccount,
            trusted,
            1
          );
          console.log("accResult", account, accResult);
          for (let index in this.selection.note.o) {
            totalResults[index] += accResult[index];
          }
          done[account] = true;
        }

        console.log("accounts", accounts);
        console.log("totalResults", totalResults);
        // second calculation - 1 algo = 1 vote

        this.processingResults = false;
      } catch (e) {
        console.log("error:", e);
        this.processingResults = false;
      }
    },
    getAccountResult(
      account,
      delegationsToAccount,
      delegationPerAccount,
      answersPerAccount,
      trusted,
      weight
    ) {
      const r = {};
      for (let index in this.selection.note.o) {
        r[index] = 0;
      }
      let failed = false;
      if (
        answersPerAccount[account] === undefined ||
        trusted[account] === undefined
      ) {
        return r; // count votes only of voted accounts and calculate their delegation value
      }
      // count the real vote .. if the account is on the list
      if (trusted[account] !== undefined) {
        let sum = 0;
        for (let index in this.selection.note.o) {
          sum += answersPerAccount[account].response[index];
          if (answersPerAccount[account].response[index] < 0) {
            failed = true;
          }
        }
        if (sum > 0 && !failed) {
          for (let index in this.selection.note.o) {
            r[index] =
              (answersPerAccount[account].response[index] / sum) * weight;
          }
        }
      }
      // check delegations
      if (delegationsToAccount[account] !== undefined) {
        for (let delegFrom in delegationsToAccount[account]) {
          if (answersPerAccount[delegFrom] !== undefined) continue; //the delegated from account voted by it self
          let sum = 0;
          for (let acc in delegationPerAccount[delegFrom]) {
            sum += delegationPerAccount[delegFrom][acc];
          }
          let w = (weight * delegationPerAccount[delegFrom][account]) / sum;
          const delegatedPowerFromOther = this.getAccountResult(
            delegFrom,
            delegationsToAccount,
            delegationPerAccount,
            answersPerAccount,
            trusted,
            w
          );

          for (let index in this.selection.note.o) {
            r[index] += delegatedPowerFromOther[index];
          }
        }
      }
      return r;
    },
  },
};
</script>
