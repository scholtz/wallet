<template>
  <MainLayout>
    <h1>Transaction detail</h1>
    <table class="table" v-if="transaction">
      <tr>
        <th>ID:</th>
        <td>{{ transaction["id"] }}</td>
      </tr>
      <tr>
        <th>tx-type:</th>
        <td>{{ transaction["tx-type"] }}</td>
      </tr>
      <tr>
        <th>close-rewards:</th>
        <td>{{ $filters.formatCurrency(transaction["close-rewards"]) }}</td>
      </tr>
      <tr>
        <th>closing-amount:</th>
        <td>{{ $filters.formatCurrency(transaction["closing-amount"]) }}</td>
      </tr>
      <tr>
        <th>confirmed-round:</th>
        <td>{{ transaction["confirmed-round"] }}</td>
      </tr>
      <tr>
        <th>fee:</th>
        <td>{{ $filters.formatCurrency(transaction["fee"]) }}</td>
      </tr>
      <tr>
        <th>first-valid:</th>
        <td>{{ transaction["first-valid"] }}</td>
      </tr>
      <tr>
        <th>genesis-id:</th>
        <td>{{ transaction["genesis-id"] }}</td>
      </tr>
      <tr>
        <th>genesis-hash:</th>
        <td>{{ transaction["genesis-hash"] }}</td>
      </tr>
      <tr>
        <th>intra-round-offset:</th>
        <td>{{ transaction["intra-round-offset"] }}</td>
      </tr>
      <tr>
        <th>last-valid:</th>
        <td>{{ transaction["last-valid"] }}</td>
      </tr>
      <tr>
        <th>payment-transaction:</th>
        <td>{{ transaction["payment-transaction"]["amount"] }}</td>
      </tr>
      <tr>
        <th>close-amount:</th>
        <td>
          {{
            $filters.formatCurrency(
              transaction["payment-transaction"]["close-amount"]
            )
          }}
        </td>
      </tr>
      <tr>
        <th>receiver:</th>
        <td>
          <router-link
            :to="'/account/' + transaction['payment-transaction']['receiver']"
            class="btn btn-xs btn-light"
            >{{ transaction["payment-transaction"]["receiver"] }}</router-link
          >
        </td>
      </tr>
      <tr>
        <th>receiver-rewards:</th>
        <td>{{ $filters.formatCurrency(transaction["receiver-rewards"]) }}</td>
      </tr>
      <tr>
        <th>round-time:</th>
        <td>{{ $filters.formatDateTime(transaction["round-time"]) }}</td>
      </tr>
      <tr>
        <th>sender:</th>
        <td>
          <router-link
            :to="'/account/' + transaction['sender']"
            class="btn btn-xs btn-light"
            >{{ transaction["sender"] }}</router-link
          >
        </td>
      </tr>
      <tr>
        <th>sender-rewards:</th>
        <td>{{ $filters.formatCurrency(transaction["sender-rewards"]) }}</td>
      </tr>
      <tr>
        <th>signature:</th>
        <td>{{ transaction["signature"]["sig"] }}</td>
      </tr>
    </table>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";

export default {
  components: {
    MainLayout,
  },
  data() {
    return {};
  },
  computed: {
    transaction() {
      console.log("transaction", this.$store.state.wallet.transaction);
      return this.$store.state.wallet.transaction;
    },
  },
};
</script>