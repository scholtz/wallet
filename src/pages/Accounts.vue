<template>
  <main-layout>
    <div class="grid">
      <div class="col">
        <h1>{{ $t("accounts.title") }}</h1>
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
    <Card>
      <template #content>
        <DataTable
          v-model:selection="selection"
          :value="accounts"
          responsive-layout="scroll"
          selection-mode="single"
          :paginator="true"
          :rows="20"
          v-model:filters="filters"
          filterDisplay="menu"
          :globalFilterFields="['name', 'addr', 'amount']"
        >
          <template #header>
            <div class="grid" v-if="filters['global']">
              <div class="col">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="filters['global'].value"
                    placeholder="Keyword Search"
                  />
                </span>
              </div>
              <div class="col h-full align-items-stretch">
                <div
                  class="text-right w-full h-full justify-content-center my-2"
                >
                  <label for="showAll" class="mr-1">
                    {{ $t("accounts.show_on_netowork_accounts") }}:
                    {{ this.$store.state.config.envName }}
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
          </template>
          <template #empty>
            {{ $t("accounts.no_accounts") }}
          </template>
          <Column
            field="name"
            :header="$t('accounts.account_name')"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                placeholder="Search by name"
              />
            </template>
          </Column>
          <Column
            field="amount"
            :header="$t('accounts.amount')"
            :sortable="true"
          >
            <template #body="slotProps">
              <div
                v-if="
                  slotProps.data &&
                  slotProps.data.data &&
                  slotProps.data.data[this.$store.state.config.env]
                "
                class="text-end"
              >
                {{
                  $filters.formatCurrency(
                    slotProps.data["data"][this.$store.state.config.env][
                      "amount"
                    ]
                  )
                }}
              </div>
              <div v-else>-</div>
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                placeholder="Search by amount"
              />
            </template>
          </Column>
          <Column
            field="addr"
            :header="$t('accounts.address')"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                placeholder="Search by address"
              />
            </template>
          </Column>

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
      </template>
    </Card>
  </main-layout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
import Checkbox from "primevue/checkbox";
import AccountType from "@/components/AccountType.vue";
import { FilterMatchMode } from "primevue/api";

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
      filters: {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        addr: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        amount: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      },
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
  async mounted() {
    if (localStorage.getItem("showNetworkAccounts") === null) {
      this.showNetworkAccounts = true;
    } else {
      this.showNetworkAccounts =
        localStorage.getItem("showNetworkAccounts") == "true";
    }
    this.fillAccounts();
    await this.updateBalance();
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
          (a) =>
            a.data &&
            !a.isHidden &&
            a.data[this.$store.state.config.env] &&
            (a.data[this.$store.state.config.env].amount > 0 ||
              // arc200 accounts does not have to have any amount
              (a.data[this.$store.state.config.env].arc200 &&
                Object.values(a.data[this.$store.state.config.env].arc200).find(
                  (a) => a.balance > 0
                )))
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
      for (const account of this.accounts) {
        await this.sleep(100);
        if (!account.addr) {
          continue;
        }
        const info = await this.accountInformation({
          addr: account.addr,
        });
        if (info) {
          await this.updateAccount({ info });
        }
      }
    },
  },
};
</script>
