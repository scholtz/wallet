<template>
  <main-layout>
    <h1>{{ $t("accounts.title") }}</h1>

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
          <div v-if="slotProps.data.rekeyedTo" class="badge bg-danger">
            {{ $t("acc_type.rekeyed") }}
          </div>
          <div v-else-if="slotProps.data.sk" class="badge bg-primary">
            {{ $t("acc_type.basic_account") }}
          </div>
          <div
            v-else-if="slotProps.data.params"
            class="badge bg-warning text-dark"
          >
            {{ $t("acc_type.multisig_account") }}
          </div>
          <div v-else class="badge bg-info text-dark">
            {{ $t("acc_type.public_account") }}
          </div>
        </template>
      </Column>
      <Column>
        <template #body="slotProps">
          <router-link
            v-if="slotProps.data.sk || slotProps.data.params"
            :to="'/accounts/pay/' + slotProps.data.addr"
            class="btn btn-light btn-xs"
          >
            {{ $t("accounts.pay") }}
          </router-link>
        </template>
      </Column>
    </DataTable>
  </main-layout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";

//import VGrid, { VGridVueTemplate } from "@revolist/vue3-datagrid";
//import VGridButton from "../components/VGridButton.vue";
export default {
  name: "App",
  components: {
    //VGrid,
    MainLayout,
  },
  data() {
    return {
      gridEditors: { button: false },
      selection: null,
    };
  },
  computed: {
    accounts() {
      return this.$store.state.wallet.privateAccounts;
    },
  },
  watch: {
    async selection() {
      if (this.selection && this.selection.addr) {
        await this.lastActiveAccount({ addr: this.selection.addr });
        this.$router.push("/account/" + this.selection.addr);
      }
    },
  },
  mounted() {
    this.updateBalance();
  },
  methods: {
    ...mapActions({
      accountInformation: "indexer/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
    }),
    updateBalance() {
      console.log("updating");
      for (let index in this.$store.state.wallet.privateAccounts) {
        this.accountInformation({
          addr: this.$store.state.wallet.privateAccounts[index].addr,
        }).then((info) => {
          if (info) {
            this.updateAccount({ info });
          }
        });
      }
    },
  },
};
</script>