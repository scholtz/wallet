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
        ></span>
        {{ $t("global.loading") }}
      </div>
    </div>
    <div v-else>
      <DataTable
        v-if="!selection"
        :value="questions"
        responsiveLayout="scroll"
        selectionMode="single"
        v-model:selection="selection"
        :paginator="true"
        :rows="20"
      >
        <template #empty> {{ $t("votequestionlist.no_questions") }} </template>
        <Column
          field="note.t"
          :header="$t('votequestionlist.question_title')"
          :sortable="true"
        ></Column>
        <Column
          field="round"
          :header="$t('votequestionlist.round')"
          :sortable="true"
        ></Column>
        <Column
          field="note.max"
          :header="$t('votequestionlist.maxround')"
          :sortable="true"
        ></Column>
        <Column
          field="round-time"
          :header="$t('votequestionlist.time')"
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
          :header="$t('votequestionlist.category')"
          :sortable="true"
        ></Column>
        <Column
          field="sender"
          :header="$t('votequestionlist.sender')"
          :sortable="true"
          styleClass="not-show-at-start"
        ></Column>
      </DataTable>
      <div v-if="selection">
        <button
          class="btn btn-xs btn-default btn-outline-primary"
          @click="this.selection = null"
        >
          {{ $t("votequestionlist.list") }}
        </button>
        <table class="table">
          <tr>
            <th>{{ $t("votequestionlist.id") }}:</th>
            <td>{{ this.selection["id"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("votequestionlist.round") }}:</th>
            <td>{{ this.selection.round }}</td>
          </tr>
          <tr v-if="this.selection && this.selection.note">
            <th>{{ $t("votequestionlist.maxround") }}:</th>
            <td>{{ this.selection.note.max }}</td>
          </tr>
          <tr v-if="this.params">
            <th>{{ $t("votequestionlist.current_round") }}:</th>
            <td>{{ this.params.firstRound }}</td>
          </tr>
          <tr>
            <th>{{ $t("votequestionlist.round_time") }}:</th>
            <td>
              {{ $filters.formatDateTime(this.selection["round-time"]) }}
            </td>
          </tr>
          <tr>
            <th>{{ $t("votequestionlist.sender") }}:</th>
            <td>{{ this.selection["sender"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("votequestionlist.question_title") }}:</th>
            <td>{{ this.selection.note.t }}</td>
          </tr>
          <tr>
            <th>{{ $t("votequestionlist.question_text") }}:</th>
            <td>
              <pre>{{ this.selection.note.q }}</pre>
            </td>
          </tr>
          <tr>
            <th>{{ $t("votequestionlist.category") }}:</th>
            <td>{{ this.selection.note["category"] }}</td>
          </tr>
          <tr>
            <th>{{ $t("votequestionlist.url") }}:</th>
            <td>{{ this.selection.note["url"] }}</td>
          </tr>
          <tr
            v-if="
              this.selection && this.selection.note && this.selection.note.o
            "
          >
            <th>{{ $t("votequestionlist.options") }}:</th>
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
                      !votingFinished ||
                      (selectedAnswer && selectedAnswer.latest)
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
                {{ $t("votequestionlist.voting_closed") }}
              </div>
              <div
                v-if="selectedAnswer && selectedAnswer.latest"
                class="alert alert-success"
              >
                {{
                  $t("votequestionlist.latest_response", {
                    accountName: $store.state.wallet.lastActiveAccountName,
                  })
                }}
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
                {{
                  $t("votequestionlist.vote_button", {
                    accountName: $store.state.wallet.lastActiveAccountName,
                  })
                }}
              </button>
              <button
                v-if="votingFinished"
                class="btn btn-primary bg-primary"
                @click="checkResults"
              >
                {{ $t("votequestionlist.check_results") }}
              </button>
              <div
                v-if="
                  Object.values(resultsFirstCalc).length > 0 &&
                  selection &&
                  selection.note &&
                  selection.note.o &&
                  Object.values(selection.note.o).length > 0
                "
              >
                <div v-if="Object.values(resultsFirstCalc).length > 0">
                  <h2>{{ $t("votequestionlist.trusted_list_results") }}</h2>
                  {{ $t("votequestionlist.sum_trusted") }}:
                  {{ resultsFirstCalcSum }}
                  <div v-for="(o, index) in this.selection.note.o" :key="index">
                    <div class="row">
                      <div class="col-3">
                        <label :for="'R1-' + index">
                          {{ o }} ({{ index }})
                        </label>
                      </div>
                      <div class="col-9">
                        <InputText
                          :id="'R1-' + index"
                          class="w1"
                          v-model.number="resultsFirstCalc[index]"
                          style="width: 14rem"
                          :disabled="true"
                        />
                        <Slider
                          class="w1"
                          v-model="resultsFirstCalc[index]"
                          style="width: 14rem"
                          :disabled="true"
                        />
                        <div class="m-2">
                          {{
                            $filters.formatPercent(
                              resultsFirstCalc[index] / 100
                            )
                          }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="Object.values(resultsSecondCalc).length > 0">
                  <h2>{{ $t("votequestionlist.hypercapitalism_results") }}</h2>
                  {{ $t("votequestionlist.sum_coins") }}:
                  {{ resultsSecondCalcSum }}
                  <div v-for="(o, index) in this.selection.note.o" :key="index">
                    <div class="row">
                      <div class="col-3">
                        <label :for="'R2-' + index">
                          {{ o }} ({{ index }})
                        </label>
                      </div>
                      <div class="col-9">
                        <InputText
                          :id="'R2-' + index"
                          class="w1"
                          v-model.number="resultsSecondCalc[index]"
                          style="width: 14rem"
                          :disabled="true"
                        />
                        <Slider
                          class="w1"
                          v-model="resultsSecondCalc[index]"
                          style="width: 14rem"
                          :disabled="true"
                        />
                        <div class="m-2">
                          {{
                            $filters.formatPercent(
                              resultsSecondCalc[index] / 100
                            )
                          }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
          {{ $t("pay.vote_help") }}
        </div>
        <AnswersList
          v-if="selection && selection.id"
          :question="selection.id"
          v-model:selectedAnswer="selectedAnswer"
        />
      </div>
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
      loading: false,
      selection: null,
      questions: [],
      answers: [],
      results: {},
      resultsFirstCalc: {},
      resultsFirstCalcSum: 0,
      resultsSecondCalc: {},
      resultsSecondCalcSum: 0,
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
    try {
      this.loading = true;
      this.params = await this.getTransactionParams();
      const txs = await this.searchForTransactionsWithNoteAndAmount({
        note: "avote-question/v1:",
        amount: 702,
        min: this.params.firstRound - 100000,
      });
      if (txs && txs.transactions) {
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
        this.error = "Error while loading data from the blockchain";
        console.log("no transactions found");
      }
      console.log("txs", txs, this.questions);
      this.loading = false;
    } catch (e) {
      console.log("e", e);
      this.loading = false;
      this.error = e;
    }
  },
  methods: {
    ...mapActions({
      searchForTransactionsWithNoteAndAmount:
        "indexer/searchForTransactionsWithNoteAndAmount",
      searchForTransactionsWithNoteAndAmountAndAccount:
        "indexer/searchForTransactionsWithNoteAndAmountAndAccount",
      openSuccess: "toast/openSuccess",
      makePayment: "algod/makePayment",
      getTransactionParams: "algod/getTransactionParams",
      waitForConfirmation: "algod/waitForConfirmation",
      prolong: "wallet/prolong",
      axiosGet: "axios/get",
      getAccountBalanceAtRound: "indexer/getAccountBalanceAtRound",
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
          min: this.params.firstRound - 100000,
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
            if (tx["confirmed-round"] > this.selection.note.max) continue; // do not count any late votes

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

        const trusted = await this.getTrustedList();
        console.log("trusted", trusted);
        const totalResults = {};
        for (let index in this.selection.note.o) {
          totalResults[index] = 0;
        }
        let done = {};
        for (let account in answersPerAccount) {
          if (done[account] !== undefined) continue; // already processed
          let accResult = this.getAccountResult(
            account,
            delegationsToAccount,
            delegationPerAccount,
            answersPerAccount,
            trusted,
            1,
            account,
            1
          );
          console.log("accResult", account, accResult);
          for (let index in this.selection.note.o) {
            totalResults[index] += accResult[index];
          }
          done[account] = true;
        }

        console.log("totalResults", totalResults);
        this.resultsFirstCalc = {};
        this.resultsFirstCalcSum = 0;
        for (let index in totalResults) {
          this.resultsFirstCalcSum +=
            Math.round(totalResults[index] * 10000) / 10000;
        }
        for (let index in totalResults) {
          this.resultsFirstCalc[index] =
            Math.round(
              (totalResults[index] / this.resultsFirstCalcSum) * 10000
            ) / 100;
        }
        this.resultsFirstCalcSum =
          Math.round(this.resultsFirstCalcSum * 1000) / 1000;
        // second calculation - 1 algo = 1 vote
        const coinResults = {};
        for (let index in this.selection.note.o) {
          coinResults[index] = 0;
        }
        done = {};
        for (let account in answersPerAccount) {
          if (done[account] !== undefined) continue; // already processed
          let accResult = await this.getAccountResultCoinVote(
            account,
            delegationsToAccount,
            delegationPerAccount,
            answersPerAccount,
            1,
            account,
            this.selection.note.max,
            1
          );
          console.log("accResult", account, accResult);
          for (let index in this.selection.note.o) {
            coinResults[index] += accResult[index];
          }
          done[account] = true;
        }

        console.log("coinResults", coinResults);
        this.resultsSecondCalc = {};
        this.resultsSecondCalcSum = 0;
        for (let index in coinResults) {
          this.resultsSecondCalcSum +=
            Math.round(coinResults[index] * 10000) / 10000;
        }
        for (let index in coinResults) {
          this.resultsSecondCalc[index] =
            Math.round(
              (coinResults[index] / this.resultsSecondCalcSum) * 10000
            ) / 100;
        }
        this.resultsSecondCalcSum =
          Math.round(this.resultsSecondCalcSum * 1000) / 1000;

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
      weight,
      voteAccount,
      depth
    ) {
      const r = {};
      for (let index in this.selection.note.o) {
        r[index] = 0;
      }
      let failed = false;
      // count the real vote .. if the account is on the list
      if (trusted[account] !== undefined) {
        let sum = 0;
        for (let index in this.selection.note.o) {
          sum += answersPerAccount[voteAccount].response[index];
          if (answersPerAccount[voteAccount].response[index] < 0) {
            failed = true;
          }
        }
        if (sum > 0 && !failed) {
          for (let index in this.selection.note.o) {
            r[index] =
              (answersPerAccount[voteAccount].response[index] / sum) * weight;
          }
        }
      }
      // check delegations
      if (delegationsToAccount[account] !== undefined) {
        for (let delegFrom in delegationsToAccount[account]) {
          if (answersPerAccount[delegFrom] !== undefined) continue; //the delegated from account voted by it self
          if (delegFrom == account) continue; //self delegation
          let sum = 0;
          console.log(
            "delegationPerAccount[delegFrom] 1",
            delegationPerAccount[delegFrom]
          );
          for (let acc in delegationPerAccount[delegFrom].d) {
            sum += parseInt(delegationPerAccount[delegFrom].d[acc]);
          }
          if (sum == 0) continue;
          let w = (weight * delegationPerAccount[delegFrom].d[account]) / sum;
          console.log("w", w);
          if (isNaN(w)) continue;
          if (w < 0.0001) continue;
          if (depth > 100) continue;
          const delegatedPowerFromOther = this.getAccountResult(
            delegFrom,
            delegationsToAccount,
            delegationPerAccount,
            answersPerAccount,
            trusted,
            w,
            voteAccount,
            depth + 1
          );
          console.log("delegation", sum, account, delegFrom, w, weight, sum);
          for (let index in this.selection.note.o) {
            r[index] += delegatedPowerFromOther[index];
          }
        }
      }
      return r;
    },
    async getAccountResultCoinVote(
      account,
      delegationsToAccount,
      delegationPerAccount,
      answersPerAccount,
      weight,
      voteAccount,
      round,
      depth
    ) {
      const r = {};
      for (let index in this.selection.note.o) {
        r[index] = 0;
      }
      let failed = false;
      // count the real vote .. if the account is on the list
      let sum = 0;
      for (let index in this.selection.note.o) {
        sum += answersPerAccount[voteAccount].response[index];
        if (answersPerAccount[voteAccount].response[index] < 0) {
          failed = true;
        }
      }
      let balance = await this.getAccountBalanceAtRound({ account, round });
      if (sum > 0 && !failed) {
        for (let index in this.selection.note.o) {
          r[index] =
            (answersPerAccount[voteAccount].response[index] / sum) *
            weight *
            balance;
        }
      }
      // check delegations
      if (delegationsToAccount[account] !== undefined) {
        console.log(
          "delegationsToAccount[account]",
          account,
          delegationsToAccount[account]
        );
        for (let delegFrom in delegationsToAccount[account]) {
          console.log("delegFrom", delegFrom);
          if (answersPerAccount[delegFrom] !== undefined) continue; //the delegated from account voted by it self
          if (delegFrom == account) continue; //self delegation
          let sum = 0;
          console.log(
            "delegationPerAccount[delegFrom] 2 ",
            delegationPerAccount[delegFrom]
          );
          for (let acc in delegationPerAccount[delegFrom].d) {
            sum += parseInt(delegationPerAccount[delegFrom].d[acc]);
          }
          console.log("sum", sum);
          if (sum == 0) continue;
          let w = (weight * delegationPerAccount[delegFrom].d[account]) / sum;
          if (isNaN(w)) continue;
          console.log("w", w);
          if (w < 0.0001) continue;
          if (depth > 100) continue;
          const delegatedPowerFromOther = await this.getAccountResultCoinVote(
            delegFrom,
            delegationsToAccount,
            delegationPerAccount,
            answersPerAccount,
            w,
            voteAccount,
            round,
            depth + 1
          );
          console.log(
            "delegation",
            round,
            sum,
            account,
            delegFrom,
            w,
            weight,
            sum
          );
          for (let index in this.selection.note.o) {
            r[index] += delegatedPowerFromOther[index];
          }
        }
      }
      return r;
    },
    async getTrustedList() {
      const ret = {};
      /*
                const accounts = await this.axiosGet({ url: "/trusted.json" });
        for (let index in accounts) {
          trusted[accounts[index]] = true;
        }*/
      const searchTL = "avote-tl/v1";
      const txs = await this.searchForTransactionsWithNoteAndAmountAndAccount({
        note: searchTL,
        amount: 705,
        account: this.selection.sender,
      });
      if (txs && txs.transactions) {
        for (let index in txs.transactions) {
          const tx = txs.transactions[index];
          if (tx["sender"] != this.selection.sender) continue;
          if (tx["confirmed-block"] > this.selection.note.max) continue;

          let note = "";
          if (this.isBase64(tx.note)) {
            note = atob(tx.note);
          }
          const searchTLWithJ = searchTL + ":j";
          if (!note.startsWith(searchTLWithJ)) {
            continue;
          }
          note = note.replace(searchTLWithJ, "");
          let noteJson = {};
          try {
            noteJson = JSON.parse(note);
          } catch (e) {
            console.log("error parsing", tx);
            continue;
          }

          if (noteJson.a) {
            for (let index in noteJson.a) {
              ret[noteJson.a[index]] = true;
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
        console.log("no transactions found");
      }
      return ret;
    },
  },
};
</script>
