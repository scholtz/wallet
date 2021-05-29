<template>
  <MainLayout>
    <h1>
      Account overview - {{ this.$store.state.wallet.lastActiveAccountName }}
    </h1>
    <p>
      {{ $route.params.account }}
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
    >
      <template #empty> No records found </template>
      <Column field="name" header="Account name"></Column>
      <Column field="addr" header="Address"></Column>
      <Column field="amount" header="Amount">
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
      <Column field="reward-base" header="reward-base"></Column>

      <Column>
        <template #body="slotProps">
          <router-link
            :to="'/accounts/pay/' + slotProps.data.addr"
            class="btn btn-light btn-xs"
            >Pay</router-link
          >
        </template>
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
    account() {
      console.log("this.account", this.account, this.lastActiveAccountAddr);
      if (
        this.account &&
        this.account.addr &&
        this.account.addr != this.lastActiveAccountAddr
      ) {
        this.lastActiveAccount({ addr: this.account.addr });
      }
    },
  },
  mounted() {
    console.log(
      "account",
      this.$route.params.account,
      this.$store.state.wallet.privateAccounts,
      this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      )
    );
  },
  methods: {
    ...mapActions({
      accountInformation: "algod/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
    }),
    reloadAccount() {
      this.accountInformation({
        addr: this.$route.params.account,
      }).then((info) => {
        if (info) {
          console.log("info", info);
          this.updateAccount({ info });
        }
      });
    },
  },
};
</script>