<template>
  <main-layout>
    <h1>Accounts overview</h1>

    <DataTable
      :value="accounts"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
      :paginator="true"
      :rows="20"
    >
      <template #empty> No records found </template>
      <Column field="name" header="Account name" :sortable="true"></Column>
      <Column field="amount" header="Amount" :sortable="true">
        <template #body="slotProps">
          <div class="text-end">
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template>
      </Column>
      <Column field="addr" header="Address" :sortable="true"></Column>

      <Column header="Type" :sortable="true">
        <template #body="slotProps">
          <div class="badge bg-primary" v-if="slotProps.data.sk">
            Basic account
          </div>
          <div
            class="badge bg-warning text-dark"
            v-else-if="slotProps.data.params"
          >
            Multisignature account
          </div>
          <div class="badge bg-info text-dark" v-else>Public account</div>
        </template>
      </Column>
      <Column>
        <template #body="slotProps">
          <router-link
            v-if="slotProps.data.sk || slotProps.data.params"
            :to="'/accounts/pay/' + slotProps.data.addr"
            class="btn btn-light btn-xs"
            >Pay</router-link
          >
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
  data() {
    return {
      gridEditors: { button: false },
      selection: null,
    };
  },
  watch: {
    async selection() {
      if (this.selection && this.selection.addr) {
        await this.lastActiveAccount({ addr: this.selection.addr });
        this.$router.push("/account/" + this.selection.addr);
      }
    },
  },
  computed: {
    accounts() {
      return this.$store.state.wallet.privateAccounts;
    },
  },
  components: {
    //VGrid,
    MainLayout,
  },
  mounted() {
    this.updateBalance();
  },
  methods: {
    ...mapActions({
      accountInformation: "algod/accountInformation",
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