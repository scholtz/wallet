<template>
  <main-layout>
    <div class="grid">
      <div class="col">
        <h1>{{ $t("accounts.title") }}</h1>
      </div>
      <div class="col">
        <div class="flex align-items-center flex-wrap h-full">
          <div class="text-right w-full">
            <label for="showAll" class="">
              {{ $t("accounts.show_on_netowork_accounts") }}:
              {{ this.$store.state.config.env }}
            </label>
            <Checkbox
              inputId="showAll"
              type="checkbox"
              class="ml-1"
              v-model="showNetworkAccounts"
              :binary="true"
            />
          </div>
        </div>
      </div>
    </div>
    <Message severity="warn" v-if="showNoAccountsForNetworkWarning">
      {{ $t("newacc.no_accounts_at_network") }}
    </Message>
    <div v-if="accounts.length == 0">
      <RouterLink to="/new-account">
        <Button class="my-5">{{ $t("newacc.create_first") }}</Button>
      </RouterLink>
    </div>
    <DataTable
      v-model:selection="selection"
      :value="accounts"
      responsive-layout="scroll"
      selection-mode="single"
      :paginator="true"
      :rows="20"
    >
      <template #empty>
        {{ $t("accounts.no_accounts") }}
      </template>
      <Column
        field="name"
        :header="$t('accounts.account_name')"
        :sortable="true"
      />
      <Column field="amount" :header="$t('accounts.amount')" :sortable="true">
        <template #body="slotProps">
          <div
            v-if="slotProps.column.props.field in slotProps.data"
            class="text-end"
          >
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
          <div v-else>-</div>
        </template>
      </Column>
      <Column field="addr" :header="$t('accounts.address')" :sortable="true" />

      <Column header="Type" :sortable="true">
        <template #body="slotProps">
          <AccountType :account="slotProps.data"></AccountType>
        </template>
      </Column>
      <Column>
        <template #body="slotProps">
          <router-link
            v-if="slotProps.data.sk || slotProps.data.params"
            :to="'/accounts/pay/' + slotProps.data.addr"
            class="ml-2"
          >
            <Button severity="secondary" size="small">
              {{ $t("accounts.pay") }}
            </Button>
          </router-link>
          <router-link
            :to="'/account/connect/' + slotProps.data.addr"
            class="ml-2"
          >
            <Button severity="secondary" size="small">
              {{ $t("accounts.connect") }}
            </Button>
          </router-link>
        </template>
      </Column>
    </DataTable>
  </main-layout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
import Checkbox from "primevue/checkbox";
import AccountType from "@/components/AccountType.vue";

//import VGrid, { VGridVueTemplate } from "@revolist/vue3-datagrid";
//import VGridButton from "../components/VGridButton.vue";
export default {
  name: "App",
  components: {
    //VGrid,
    MainLayout,
    Checkbox,
    AccountType,
  },
  data() {
    return {
      gridEditors: { button: false },
      selection: null,
      showNetworkAccounts: true,
      accounts: [],
      showNoAccountsForNetworkWarning: false,
    };
  },
  watch: {
    async selection() {
      if (this.selection && this.selection.addr) {
        await this.lastActiveAccount({ addr: this.selection.addr });
        this.$router.push("/account/" + this.selection.addr);
      }
    },
    showNetworkAccounts() {
      localStorage.setItem("showNetworkAccounts", this.showNetworkAccounts);
      this.fillAccounts();
    },
  },
  mounted() {
    this.updateBalance();
    if (localStorage.getItem("showNetworkAccounts") === null) {
      this.showNetworkAccounts = true;
    } else {
      this.showNetworkAccounts =
        localStorage.getItem("showNetworkAccounts") == "true";
    }
    this.fillAccounts();
  },
  methods: {
    ...mapActions({
      accountInformation: "indexer/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
    }),
    fillAccounts() {
      this.showNoAccountsForNetworkWarning = false;
      if (this.showNetworkAccounts) {
        this.accounts = Object.values(
          this.$store.state.wallet.privateAccounts
        ).filter(
          (a) => a.network == this.$store.state.config.env && !a.isHidden
        );
        if (!this.accounts.length) {
          this.accounts = Object.values(
            this.$store.state.wallet.privateAccounts
          );
          if (this.accounts.length > 0) {
            this.showNoAccountsForNetworkWarning = true;
          }
        }
      } else {
        this.accounts = Object.values(this.$store.state.wallet.privateAccounts);
      }
    },
    sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    },
    async updateBalance() {
      for (let index in this.$store.state.wallet.privateAccounts) {
        await this.sleep(100);
        if (!this.$store.state.wallet.privateAccounts[index]) {
          return;
        }
        this.accountInformation({
          addr: this.$store.state.wallet.privateAccounts[index].addr,
        })
          .then((info) => {
            if (info) {
              this.updateAccount({ info });
            }
          })
          .catch((e) => {
            if (e.message.indexOf("404") >= 0) {
              const info = {
                address: this.$store.state.wallet.privateAccounts[index].addr,
                amount: 0,
                "amount-without-pending-rewards": 0,
                "created-at-round": 0,
                deleted: false,
                "pending-rewards": 0,
                "reward-base": 0,
                rewards: 0,
                round: 0,
                "sig-type": "sig",
                status: "Offline",
                "total-apps-opted-in": 0,
                "total-assets-opted-in": 0,
                "total-created-apps": 0,
                "total-created-assets": 0,
              };

              this.updateAccount({ info });
            }
          });
      }
    },
  },
};
</script>
