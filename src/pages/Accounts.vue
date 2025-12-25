<template>
  <main-layout>
    <div class="grid">
      <div class="col">
        <h1>{{ t("accounts.title") }}</h1>
      </div>
    </div>
    <Message severity="warn" v-if="showNoAccountsForNetworkWarning">
      {{ t("newacc.no_accounts_at_network") }}
    </Message>
    <div v-if="accounts.length == 0">
      <RouterLink to="/new-account/ed25519">
        <Button class="my-5" id="create-first">
          {{ t("newacc.create_first") }}
        </Button>
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
                <InputGroup>
                  <InputGroupAddon><i class="pi pi-search" /></InputGroupAddon>
                  <InputText
                    v-model="filters['global'].value"
                    :placeholder="t('placeholders.keyword_search')"
                  />
                </InputGroup>
              </div>
              <div class="col h-full align-items-stretch">
                <div
                  class="text-right w-full h-full justify-content-center my-2"
                >
                  <label for="showAll" class="mr-1">
                    {{ t("accounts.show_on_netowork_accounts") }}:
                    {{ store.state.config.envName }}
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
            {{ t("accounts.no_accounts") }}
          </template>
          <Column
            field="name"
            :header="t('accounts.account_name')"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                :placeholder="t('placeholders.search_by_name')"
              />
            </template>
          </Column>
          <Column
            field="amount"
            :header="t('accounts.amount')"
            :sortable="true"
          >
            <template #body="slotProps">
              <div
                v-if="
                  slotProps.data &&
                  slotProps.data.data &&
                  slotProps.data.data[store.state.config.env]
                "
                class="text-end"
              >
                {{
                  formatCurrency(
                    slotProps.data["data"][store.state.config.env]["amount"]
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
                :placeholder="t('placeholders.search_by_amount')"
              />
            </template>
          </Column>
          <Column field="addr" :header="t('accounts.address')" :sortable="true">
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                :placeholder="t('placeholders.search_by_address')"
              />
            </template>
          </Column>

          <Column header="Type" :sortable="true">
            <template #body="slotProps">
              <AccountType
                :account="slotProps.data"
                :account-data="accountData(slotProps.data)"
              ></AccountType>
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
                  {{ t("accounts.pay") }}
                </Button>
              </router-link>
              <router-link
                :to="'/account/connect/' + slotProps.data.addr"
                class="ml-2"
              >
                <Button severity="secondary" size="small">
                  {{ t("accounts.connect") }}
                </Button>
              </router-link>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </main-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import MainLayout from "../layouts/Main.vue";
import Checkbox from "primevue/checkbox";
import AccountType from "@/components/AccountType.vue";
import { FilterMatchMode } from "primevue/api";
import InputGroup from "primevue/inputgroup";
import InputGroupAddon from "primevue/inputgroupaddon";
import { useI18n } from "vue-i18n";
import formatCurrency from "@/scripts/numbers/formatCurrency";
import { RootState } from "@/store";
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { IAccountData, WalletAccount } from "@/store/wallet";
type DisplayAccount = WalletAccount & { amount: number };
type FilterMode = (typeof FilterMatchMode)[keyof typeof FilterMatchMode];

type FilterEntry = {
  value: string | null;
  matchMode: FilterMode;
};

type AccountsFilters = {
  global: FilterEntry;
  name: FilterEntry;
  addr: FilterEntry;
  amount: FilterEntry;
};

const store = useStore<RootState>();
const router = useRouter();
const { t } = useI18n();

const selection = ref<WalletAccount | null>(null);
const showNetworkAccounts = ref(false);
const accounts = ref<DisplayAccount[]>([]);
const showNoAccountsForNetworkWarning = ref(false);
const filters = ref<AccountsFilters>({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  addr: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  amount: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
});

const isAuth = computed(() => store.state.wallet.isOpen);

const accountData = (account?: WalletAccount): IAccountData | undefined => {
  return account?.data?.[store.state.config.env];
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const fillAccounts = () => {
  showNoAccountsForNetworkWarning.value = false;
  const privateAccounts = Object.values(
    store.state.wallet.privateAccounts || {}
  ) as WalletAccount[];

  let filteredAccounts: WalletAccount[] = [];

  if (showNetworkAccounts.value) {
    filteredAccounts = privateAccounts.filter((account) => {
      if (account.isHidden) {
        return false;
      }
      const envData = accountData(account);
      if (!envData) {
        return false;
      }
      const hasPositiveBalance = BigInt(envData?.amount ?? 0) > 0;
      const hasArc200Balance = envData.arc200
        ? Object.values(envData.arc200).some(
            (holding) => holding && holding.balance > 0
          )
        : false;
      return hasPositiveBalance || hasArc200Balance;
    });

    if (filteredAccounts.length === 0 && privateAccounts.length > 0) {
      filteredAccounts = privateAccounts;
      showNoAccountsForNetworkWarning.value = true;
    }
  } else {
    filteredAccounts = privateAccounts;
  }
  filteredAccounts = filteredAccounts.map((account) => {
    let addr = account.addr;
    if (typeof account.addr !== "string") {
      // if addr is algorand address object, convert to string
      const pk = (account.addr as any)?.publicKey;
      if (pk) {
        var buffer = Buffer.from(Object.values(pk));
        const obj = new algosdk.Address(buffer);
        addr = obj.toString();
      }
    }
    return {
      ...account,
      addr,
    };
  });

  accounts.value = filteredAccounts.map((account) => {
    const envData = accountData(account);
    if (envData) {
      const amount = envData?.amount ?? 0;
      return {
        ...account,
        amount,
      } as DisplayAccount;
    }
    return {
      ...account,
      amount: 0,
    } as DisplayAccount;
  });
};

const accountInformation = (payload: { addr: string }) =>
  store.dispatch("indexer/accountInformation", payload);
const updateAccount = (payload: { info: unknown }) =>
  store.dispatch("wallet/updateAccount", payload);
const lastActiveAccount = (payload: { addr: string }) =>
  store.dispatch("wallet/lastActiveAccount", payload);

const updateBalance = async () => {
  for (const account of accounts.value) {
    await sleep(100);
    if (!account.addr) {
      continue;
    }
    try {
      const info = await accountInformation({
        addr: account.addr,
      });
      if (info) {
        await updateAccount({ info });
      }
    } catch (error) {
      const message =
        (error as Error)?.message || "accountInformation request failed";
      if (message.includes("no accounts found")) {
        console.warn(
          `Skipping missing account ${account.addr}: ${message}`,
          error
        );
      } else {
        console.error(
          `Failed to refresh account ${account.addr}: ${message}`,
          error
        );
      }
    }
  }
};

watch(
  () => selection.value?.addr,
  async (value) => {
    if (value) {
      await lastActiveAccount({ addr: value });
      router.push(`/account/${value}`);
    }
  }
);

watch(showNetworkAccounts, (value) => {
  localStorage.setItem("showNetworkAccounts", String(value));
  fillAccounts();
});

watch(isAuth, (value) => {
  accounts.value = [];
  if (value) {
    fillAccounts();
  }
});

onMounted(async () => {
  accounts.value = [];
  const stored = localStorage.getItem("showNetworkAccounts");
  if (stored === null) {
    showNetworkAccounts.value = true;
  } else {
    showNetworkAccounts.value = stored === "true";
  }
  fillAccounts();
  await updateBalance();
  fillAccounts();
});
</script>
