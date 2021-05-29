<template>
  <MainLayout>
    <h1>
      Account overview - {{ this.$store.state.wallet.lastActiveAccountName }}
    </h1>
    <p>
      <router-link
        :to="'/accounts/pay/' + $route.params.account"
        class="btn btn-light btn-xs"
        >Make new payment</router-link
      >
    </p>
    <table class="table" v-if="account">
      <tr>
        <th>Name:</th>
        <td>{{ account["name"] }}</td>
      </tr>
      <tr>
        <th>Address:</th>
        <td>{{ account.address }}</td>
      </tr>
      <tr>
        <th>amount:</th>
        <td>{{ $filters.formatCurrency(account.amount) }}</td>
      </tr>
      <tr>
        <th>amount-without-pending-rewards:</th>
        <td>
          {{
            $filters.formatCurrency(account["amount-without-pending-rewards"])
          }}
        </td>
      </tr>
      <tr>
        <th>rewards:</th>
        <td>{{ $filters.formatCurrency(account["rewards"]) }}</td>
      </tr>
      <tr>
        <th>pending-rewards:</th>
        <td>{{ $filters.formatCurrency(account["pending-rewards"]) }}</td>
      </tr>
      <tr>
        <th>reward-base:</th>
        <td>{{ account["reward-base"] }}</td>
      </tr>
      <tr>
        <th>round:</th>
        <td>{{ account["round"] }}</td>
      </tr>
      <tr>
        <th>apps-local-state:</th>
        <td>{{ account["apps-local-state"] }}</td>
      </tr>
      <tr>
        <th>apps-total-schema:</th>
        <td>{{ account["apps-total-schema"] }}</td>
      </tr>
      <tr>
        <th>assets:</th>
        <td>{{ account["assets"] }}</td>
      </tr>
      <tr>
        <th>created-apps:</th>
        <td>{{ account["created-apps"] }}</td>
      </tr>
      <tr>
        <th>status:</th>
        <td>{{ account["status"] }}</td>
      </tr>
      <tr>
        <th></th>
        <td>
          <button class="btn btn-light btn-xs" @click="reloadAccount">
            Refresh
          </button>
        </td>
      </tr>
    </table>

    <h2>Transactions</h2>

    <DataTable
      :value="transactions"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
      :paginator="true"
      :rows="20"
    >
      <template #empty> No transactions found </template>
      <Column field="tx-type" header="Type" :sortable="true"></Column>
      <Column field="round-time" header="Time" :sortable="true">
        <template #body="slotProps">
          {{
            $filters.formatDateTime(
              slotProps.data[slotProps.column.props.field]
            )
          }}
        </template>
      </Column>
      <Column
        field="payment-transaction.amount"
        header="Amount"
        :sortable="true"
      >
        <template #body="slotProps">
          <div class="text-end">
            {{
              $filters.formatCurrency(
                slotProps.data["payment-transaction"]["amount"]
              )
            }}
          </div>
        </template></Column
      >
      <Column field="sender" header="Sender" :sortable="true"></Column>
      <Column
        field="payment-transaction.receiver"
        header="Receiver"
        :sortable="true"
      ></Column>
      <Column
        field="receiver-rewards"
        header="Receiver rewards"
        :sortable="true"
      >
        <template #body="slotProps">
          <div class="text-end">
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template></Column
      >
      <Column field="fee" header="fee" :sortable="true"
        ><template #body="slotProps">
          <div class="text-end">
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template></Column
      >
      <Column field="confirmed-round" header="Confirmed round" :sortable="true">
      </Column>
    </DataTable>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";

export default {
  components: {
    MainLayout,
  },
  data() {
    return {
      transactions: [],
      selection: null,
    };
  },
  computed: {
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      );
    },
    lastActiveAccountAddr() {
      return this.$store.state.wallet.lastActiveAccount;
    },
  },
  watch: {
    async selection() {
      await this.setTransaction({ transaction: this.selection });
      console.log("this.selection", this.selection);
      if (this.selection.id) {
        this.$router.push("/transaction/" + this.selection.id);
      }
    },
  },
  mounted() {
    this.reloadAccount();
  },
  methods: {
    ...mapActions({
      accountInformation: "algod/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
      searchForTransactions: "indexer/searchForTransactions",
      setTransaction: "wallet/setTransaction",
    }),
    async reloadAccount() {
      this.accountInformation({
        addr: this.$route.params.account,
      }).then((info) => {
        if (info) {
          console.log("info", info);
          this.updateAccount({ info });
        }
      });
      const searchData = await this.searchForTransactions({
        addr: this.$route.params.account,
      });
      if (searchData) {
        this.transactions = searchData.transactions;
      }
      console.log("this.transactions", this.transactions);
    },
  },
};
</script>