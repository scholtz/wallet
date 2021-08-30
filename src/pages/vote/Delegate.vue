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
        ></span>
        {{ $t("global.loading") }}
      </div>
    </div>
    <div v-else>
      <VoteMenu current="delegate" />
      <h1>{{ $t("votedelegate.title") }}</h1>
      <p>
        {{ $t("votedelegate.intro1") }}
      </p>
      <p>
        {{ $t("votedelegate.intro2") }}
      </p>
      <p>
        {{ $t("votedelegate.intro3") }}
      </p>
      <p>
        {{ $t("votedelegate.intro4") }}
      </p>
      <div v-for="(delegation, category) in delegations" :key="category">
        <hr />
        <h2 v-if="category == 'any'">{{ $t("votedelegate.category_any") }}</h2>
        <h2 v-else>{{ category }}</h2>
        <div v-for="(weight, account) in delegation" :key="account">
          <div class="row">
            <div class="col-8">
              <label :for="'A' + category + account">
                {{ getAccountName(account) }}
                {{ account }}
              </label>
            </div>
            <div class="col-4">
              <InputText
                :id="'A' + category + account"
                class="w1"
                v-model.number="delegation[account]"
                style="width: 14rem"
              />
              <Slider
                class="w1"
                v-model="delegation[account]"
                style="width: 14rem"
              />
              <div class="m-2">
                {{
                  $filters.formatPercent(delegation[account] / sum(delegation))
                }}
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-2">
            <label :for="'add-' + category">{{
              $t("votedelegate.add_account")
            }}</label>
          </div>
          <div class="col-1">
            <div class="form-check m-1">
              <input
                class="form-check-input"
                type="checkbox"
                v-model="walletAddress"
                :id="'custom-' + category"
              />
              <label class="form-check-label" :for="'custom-' + category">
                {{ $t("votedelegate.wallet_address") }}
              </label>
            </div>
          </div>
          <div class="col-7">
            <input
              v-if="!walletAddress"
              :id="'add-' + category"
              :ref="'add-' + category"
              class="form-control"
            />
            <select
              class="form-control"
              :ref="'add-select-' + category"
              v-if="walletAddress"
            >
              <option
                v-for="option in $store.state.wallet.privateAccounts"
                :key="option.addr"
                :value="option.addr"
              >
                {{ option.name + "  - " + option.addr }}
              </option>
            </select>
          </div>
          <div class="col-2">
            <button
              class="btn btn-light btn-outline-primary"
              @click="addDelegation(category)"
            >
              {{ $t("votedelegate.delegate") }}
            </button>
          </div>
        </div>
      </div>

      <hr />
      <div class="row">
        <div class="col-10">
          <label for="newCategory">{{ $t("votedelegate.category") }}</label>
          <input
            id="newCategory"
            v-model="newCategory"
            class="form-control"
            :placeholder="$t('votedelegate.category_placeholder')"
          />
        </div>
        <div class="col-2">
          <button
            class="btn btn-light btn-outline-primary"
            @click="this.delegations[this.newCategory] = {}"
          >
            {{ $t("votedelegate.add_category") }}
          </button>
        </div>
      </div>

      <hr />
      <div class="row">
        <div class="col-12">
          <p>
            {{ $t("votedelegate.submit_help") }}
          </p>
          <div class="my-2">
            <code>
              {{ note }}
            </code>
          </div>
          <button
            class="btn btn-primary"
            @click="submitDelegation"
            :disabled="!note || processing"
          >
            {{
              $t("votedelegate.submit_text", {
                accountName: $store.state.wallet.lastActiveAccountName,
              })
            }}
          </button>
        </div>
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
  data() {
    return {
      loading: false,
      delegations: { any: {} },
      walletAddress: true,
      newCategory: "",
      params: null,
      tx: null,
      processing: false,
      confirmedRound: null,
      error: "",
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
      const json = {};
      const d = {};
      for (const category in this.delegations) {
        const delegation = this.delegations[category];
        for (const account in delegation) {
          if (delegation[account] > 0) {
            if (d[category] === undefined) d[category] = {};
            d[category][account] = delegation[account];
          }
        }
      }
      json.d = d;
      return "avote-delegation/v1:j" + JSON.stringify(json);
    },
  },
  async mounted() {
    this.prolong();
    await this.loadMyDelegation();
  },
  methods: {
    ...mapActions({
      makeAssetCreateTxnWithSuggestedParams:
        "algod/makeAssetCreateTxnWithSuggestedParams",
      openSuccess: "toast/openSuccess",
      makePayment: "algod/makePayment",
      getTransactionParams: "algod/getTransactionParams",
      waitForConfirmation: "algod/waitForConfirmation",
      searchForTransactionsWithNoteAndAmountAndAccount:
        "indexer/searchForTransactionsWithNoteAndAmountAndAccount",
      prolong: "wallet/prolong",
    }),
    async loadMyDelegation() {
      const search = "avote-delegation/v1";
      this.loading = true;
      const txs = await this.searchForTransactionsWithNoteAndAmountAndAccount({
        note: search,
        amount: 701,
        account: this.$store.state.wallet.lastActiveAccount,
      });
      this.loading = false;
      let latest = null;
      if (txs && txs.transactions) {
        for (let index in txs.transactions) {
          const tx = txs.transactions[index];
          if (tx["sender"] != this.$store.state.wallet.lastActiveAccount)
            continue;
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
          console.log("noteJson", noteJson);
          const answ = {
            round: tx["confirmed-round"],
            d: noteJson.d,
          };
          if (!latest) latest = answ;
          if (latest.round < answ.round) latest = answ;
        }
      } else {
        this.error = "Error while loading data from the blockchain";
        console.log("no transactions found");
      }
      console.log("latest", latest);
      if (latest) {
        this.delegations = latest.d;
      }
      console.log("txs", txs, this.questions);
    },
    sum(delegation) {
      if (!delegation) return 0;
      let ret = 0;
      for (let index in delegation) {
        ret += delegation[index];
      }
      return ret;
    },
    getAccountName(account) {
      const acc = this.$store.state.wallet.privateAccounts.filter(
        (a) => a.addr == account
      );
      for (let index in acc) {
        if (acc[index].name) {
          return acc[index].name;
        }
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
    addDelegation(category) {
      if (this.walletAddress) {
        this.delegations[category][
          this.$refs["add-select-" + category].value
        ] = 100;
        this.$refs["add-select-" + category].value = "";
      } else {
        this.delegations[category][this.$refs["add-" + category].value] = 100;
        this.$refs["add-" + category].value = "";
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
    async submitDelegation(e) {
      this.prolong();
      e.preventDefault();
      try {
        const payTo = this.$store.state.wallet.lastActiveAccount;
        const payFrom = this.$store.state.wallet.lastActiveAccount;
        const amount = 701;
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