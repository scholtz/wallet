<template>
  <MainLayout>
    <h1>{{ $t("transaction.title") }}</h1>
    <table class="table" v-if="transaction">
      <tr>
        <th>{{ $t("transaction.tr_id") }}:</th>
        <td>{{ transaction["id"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.tr_id") }}:</th>
        <td>{{ $filters.formatDateTime(transaction["round-time"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.tr_type") }}:</th>
        <td>{{ transaction["tx-type"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.note") }}:</th>
        <td>
          <b>{{ $t("transaction.note_raw") }}:</b><br />
          <code>{{ transaction["note"] }}</code>
          <div>
            <b>{{ $t("transaction.note_decoded") }}:</b><br />
            <code v-if="isBase64(transaction['note'])">{{
              fromB64(transaction["note"])
            }}</code>
          </div>
        </td>
      </tr>
      <tr>
        <th>{{ $t("transaction.created_asset") }}:</th>
        <td>{{ transaction["created-asset-index"] }}</td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_name") }}:</th>
        <td>{{ transaction["asset-config-transaction"]["params"]["name"] }}</td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_creator") }}:</th>
        <td>
          <router-link
            v-if="
              transaction['asset-config-transaction'] &&
              transaction['asset-config-transaction']['params'] &&
              transaction['asset-config-transaction']['params']['creator']
            "
            :to="
              '/account/' +
              transaction['asset-config-transaction']['params']['creator']
            "
            class="btn btn-xs btn-light"
            >{{
              transaction["asset-config-transaction"]["params"]["creator"]
            }}</router-link
          >
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_manager") }}:</th>
        <td>
          <router-link
            v-if="
              transaction['asset-config-transaction'] &&
              transaction['asset-config-transaction']['params'] &&
              transaction['asset-config-transaction']['params']['manager']
            "
            :to="
              '/account/' +
              transaction['asset-config-transaction']['params']['manager']
            "
            class="btn btn-xs btn-light"
            >{{
              transaction["asset-config-transaction"]["params"]["manager"]
            }}</router-link
          >
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_reserve") }}:</th>
        <td>
          <router-link
            v-if="
              transaction['asset-config-transaction'] &&
              transaction['asset-config-transaction']['params'] &&
              transaction['asset-config-transaction']['params']['reserve']
            "
            :to="
              '/account/' +
              transaction['asset-config-transaction']['params']['reserve']
            "
            class="btn btn-xs btn-light"
            >{{
              transaction["asset-config-transaction"]["params"]["reserve"]
            }}</router-link
          >
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_freeze") }}:</th>
        <td>
          <router-link
            v-if="
              transaction['asset-config-transaction'] &&
              transaction['asset-config-transaction']['params'] &&
              transaction['asset-config-transaction']['params']['freeze']
            "
            :to="
              '/account/' +
              transaction['asset-config-transaction']['params']['freeze']
            "
            class="btn btn-xs btn-light"
            >{{
              transaction["asset-config-transaction"]["params"]["freeze"]
            }}</router-link
          >
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_clawback") }}:</th>
        <td>
          <router-link
            v-if="
              transaction['asset-config-transaction'] &&
              transaction['asset-config-transaction']['params'] &&
              transaction['asset-config-transaction']['params']['clawback']
            "
            :to="
              '/account/' +
              transaction['asset-config-transaction']['params']['clawback']
            "
            class="btn btn-xs btn-light"
            >{{
              transaction["asset-config-transaction"]["params"]["clawback"]
            }}</router-link
          >
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_unitName") }}:</th>
        <td>
          {{ transaction["asset-config-transaction"]["params"]["unit-name"] }}
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_total") }}:</th>
        <td>
          {{ transaction["asset-config-transaction"]["params"]["total"] }}
          {{ transaction["asset-config-transaction"]["params"]["unit-name"] }}
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_decimals") }}:</th>
        <td>
          {{ transaction["asset-config-transaction"]["params"]["decimals"] }}
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_defaultfrozen") }}:</th>
        <td>
          {{
            transaction["asset-config-transaction"]["params"]["default-frozen"]
          }}
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_url") }}:</th>
        <td>
          {{ transaction["asset-config-transaction"]["params"]["url"] }}
        </td>
      </tr>
      <tr v-if="transaction['asset-config-transaction']">
        <th>{{ $t("transaction.asset_metadata") }}:</th>
        <td>
          {{
            transaction["asset-config-transaction"]["params"]["metadata-hash"]
          }}
        </td>
      </tr>
      <tr>
        <th>{{ $t("transaction.tr_close_rewards") }}:</th>
        <td>{{ $filters.formatCurrency(transaction["close-rewards"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.closing_amount") }}:</th>
        <td>{{ $filters.formatCurrency(transaction["closing-amount"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.confirmed_round") }}:</th>
        <td>{{ transaction["confirmed-round"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.fee") }}:</th>
        <td>{{ $filters.formatCurrency(transaction["fee"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.first_valid") }}:</th>
        <td>{{ transaction["first-valid"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.genesis_id") }}:</th>
        <td>{{ transaction["genesis-id"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.genesis_hash") }}:</th>
        <td>{{ transaction["genesis-hash"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.intra_round") }}:</th>
        <td>{{ transaction["intra-round-offset"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.last_valid") }}:</th>
        <td>{{ transaction["last-valid"] }}</td>
      </tr>
      <tr v-if="transaction['payment-transaction']">
        <th>{{ $t("transaction.amount") }}:</th>
        <td>{{ transaction["payment-transaction"]["amount"] }}</td>
      </tr>
      <tr v-if="transaction['payment-transaction']">
        <th>{{ $t("transaction.close_amount") }}:</th>
        <td>
          {{
            $filters.formatCurrency(
              transaction["payment-transaction"]["close-amount"]
            )
          }}
        </td>
      </tr>
      <tr v-if="transaction['payment-transaction']">
        <th>{{ $t("transaction.receiver") }}:</th>
        <td>
          <router-link
            :to="'/account/' + transaction['payment-transaction']['receiver']"
            class="btn btn-xs btn-light"
            >{{ transaction["payment-transaction"]["receiver"] }}</router-link
          >
        </td>
      </tr>
      <tr>
        <th>{{ $t("transaction.receiver_rewards") }}:</th>
        <td>{{ $filters.formatCurrency(transaction["receiver-rewards"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.sender") }}:</th>
        <td>
          <router-link
            :to="'/account/' + transaction['sender']"
            class="btn btn-xs btn-light"
            >{{ transaction["sender"] }}</router-link
          >
        </td>
      </tr>
      <tr>
        <th>{{ $t("transaction.sender_rewards") }}:</th>
        <td>{{ $filters.formatCurrency(transaction["sender-rewards"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("transaction.signature") }}:</th>
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
  methods: {
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
    fromB64(str) {
      return atob(str);
    },
  },
};
</script>