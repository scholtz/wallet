<template>
  <MainLayout>
    <h1>
      {{ $t("acc_overview.title") }} -
      {{ this.$store.state.wallet.lastActiveAccountName }}
    </h1>
    <p>
      <button
        @click="displayDeleteDialog = true"
        class="btn btn-light btn-xs m-2 float-end"
      >
        <div>{{ $t("acc_overview.delete") }}</div>
      </button>

      <Dialog
        :header="$t('acc_overview.delete_header')"
        v-model:visible="displayDeleteDialog"
        :modal="true"
      >
        <p>{{ $t("acc_overview.delete_confirm") }}</p>
        <p v-if="account">
          <b>{{ account.name }}</b>
        </p>
        <p v-if="account">{{ account.addr }}</p>

        <template #footer
          ><button
            @click="displayDeleteDialog = false"
            class="btn btn-xs btn-primary"
          >
            {{ $t("global.cancel") }}</button
          ><button class="btn btn-xs btn-danger" @click="deleteAccountClick">
            {{ $t("acc_overview.delete_confirm_button") }}
          </button></template
        >
      </Dialog>
      <router-link
        v-if="account && (account.sk || account.params)"
        :to="'/accounts/pay/' + $route.params.account"
        class="btn btn-light btn-xs me-2 my-2"
        >{{ $t("acc_overview.pay") }}</router-link
      >
      <router-link
        v-if="account && (account.sk || account.params)"
        :to="'/accounts/rekey/' + $route.params.account"
        class="btn btn-light btn-xs me-2 my-2"
        >{{ $t("acc_overview.rekey") }}</router-link
      >
      <router-link
        v-if="account && (account.sk || account.params)"
        :to="'/account/optin/' + $route.params.account"
        class="btn btn-light btn-xs me-2 my-2"
        >{{ $t("acc_overview.asset_optin") }}</router-link
      >
      <router-link
        :to="'/receive-payment/' + $route.params.account"
        class="btn btn-light btn-xs me-2 my-2"
        >{{ $t("acc_overview.receive_payment") }}</router-link
      >
      <router-link
        :to="'/payment-gateway/' + $route.params.account"
        class="btn btn-light btn-xs me-2 my-2"
        >{{ $t("acc_overview.payment_gateway") }}</router-link
      >
      <router-link
        v-if="account && (account.sk || account.params)"
        :to="'/vote/ask/'"
        class="btn btn-light btn-xs me-2 my-2"
        >{{ $t("acc_overview.ask_question") }}</router-link
      >
    </p>
    <table class="w-100" v-if="account">
      <tr>
        <th>{{ $t("acc_overview.name") }}:</th>
        <td>{{ account["name"] }}</td>
        <td rowspan="15" class="text-end">
          <QRCodeVue3
            class="d-md-none d-lg-block"
            :width="400"
            :height="400"
            :value="account.addr"
            :qrOptions="{ errorCorrectionLevel: 'H' }"
            image="/img/algorand-algo-logo-96.png"
          />
        </td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.type") }}:</th>
        <td>
          <div class="badge bg-danger" v-if="account.rekeyedTo">
            {{ $t("acc_type.rekeyed") }}
          </div>
          <div class="badge bg-primary" v-else-if="account.sk">
            {{ $t("acc_type.basic_account") }}
          </div>
          <div class="badge bg-warning text-dark" v-else-if="account.params">
            {{ $t("acc_type.multisig_account") }}
          </div>
          <div class="badge bg-info text-dark" v-else>
            {{ $t("acc_type.public_account") }}
          </div>
        </td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.address") }}:</th>
        <td>
          <button
            class="btn btn-xs btn-light m-1"
            :title="$t('global.copy_address')"
            @click="copyToClipboard(account.address)"
          >
            <i class="pi pi-copy"></i>
          </button>
          {{ account.address }}
        </td>
      </tr>
      <tr v-if="account.rekeyedTo">
        <th>{{ $t("acc_overview.rekeyedTo") }}:</th>
        <td>
          {{ account.rekeyedTo }}

          <div v-if="rekeyedToInfo">
            <div class="badge bg-danger" v-if="rekeyedToInfo.rekeyedTo">
              {{ $t("acc_type.rekeyed") }}
            </div>
            <div class="badge bg-primary" v-else-if="rekeyedToInfo.sk">
              {{ $t("acc_type.basic_account") }}
            </div>
            <div
              class="badge bg-warning text-dark"
              v-else-if="rekeyedToInfo.params"
            >
              {{ $t("acc_type.multisig_account") }}
            </div>
            <div class="badge bg-info text-dark" v-else>
              {{ $t("acc_type.public_account") }}
            </div>
            <table v-if="rekeyedToInfo.params">
              <tr v-if="rekeyedToInfo.params">
                <th>{{ $t("acc_overview.multisignature_threshold") }}:</th>
                <td>{{ rekeyedToInfo.params.threshold }}</td>
              </tr>
              <tr v-if="rekeyedToInfo.params">
                <th>{{ $t("acc_overview.multisignature_addresses") }}:</th>
                <td>{{ rekeyedToInfo.params.addrs }}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.amount") }}:</th>
        <td>{{ $filters.formatCurrency(account.amount) }}</td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.amount_without_pending") }}:</th>
        <td>
          {{
            $filters.formatCurrency(account["amount-without-pending-rewards"])
          }}
        </td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.rewards") }}:</th>
        <td>{{ $filters.formatCurrency(account["rewards"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.pending_rewards") }}:</th>
        <td>{{ $filters.formatCurrency(account["pending-rewards"]) }}</td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.reward_base") }}:</th>
        <td>{{ account["reward-base"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.round") }}:</th>
        <td>{{ account["round"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.apps_local_state") }}:</th>
        <td>{{ account["apps-local-state"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.apps_total_schema") }}:</th>
        <td>{{ account["apps-total-schema"] }}</td>
      </tr>
      <tr v-if="account['assets'] && account['assets'].length > 0">
        <th>{{ $t("acc_overview.assets") }}:</th>
        <td>
          <table class="w-100">
            <thead>
              <tr>
                <th>ASA Amount</th>
                <th>ASA ID</th>
                <th>IsFrozen</th>
                <th>Creator</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="asset in account['assets']" :key="asset['asset-id']">
                <td>
                  {{
                    $filters.formatCurrency(
                      asset["amount"],
                      getAssetName(asset["asset-id"]),
                      getAssetDecimals(asset["asset-id"])
                    )
                  }}
                </td>
                <td>{{ asset["asset-id"] }}</td>
                <td>{{ asset["is-frozen"] }}</td>
                <td>{{ asset["creator"] }}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.created_apps") }}:</th>
        <td>{{ account["created-apps"] }}</td>
      </tr>
      <tr>
        <th>{{ $t("acc_overview.status") }}:</th>
        <td>{{ account["status"] }}</td>
      </tr>
      <tr v-if="account.params">
        <th>{{ $t("acc_overview.multisignature_threshold") }}:</th>
        <td>{{ account.params.threshold }}</td>
      </tr>
      <tr v-if="account.params">
        <th>{{ $t("acc_overview.multisignature_addresses") }}:</th>
        <td>{{ account.params.addrs }}</td>
      </tr>
      <tr>
        <th></th>
        <td>
          <button class="btn btn-light btn-xs" @click="reloadAccount">
            {{ $t("acc_overview.refresh") }}
          </button>
        </td>
      </tr>
    </table>

    <h2>{{ $t("acc_overview.transactions") }}</h2>

    <DataTable
      :value="transactions"
      responsiveLayout="scroll"
      selectionMode="single"
      v-model:selection="selection"
      :paginator="true"
      :rows="20"
    >
      <template #empty> {{ $t("acc_overview.no_transactions") }} </template>
      <Column
        field="tx-type"
        :header="$t('acc_overview.type')"
        :sortable="true"
      ></Column>
      <Column
        field="round-time"
        :header="$t('acc_overview.time')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div v-if="slotProps.column.props.field in slotProps.data">
            {{
              $filters.formatDateTime(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template>
      </Column>
      <Column
        field="payment-transaction.amount"
        :header="$t('acc_overview.tr_amount')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div
            class="text-end"
            v-if="
              slotProps.data['tx-type'] == 'pay' &&
              'payment-transaction' in slotProps.data &&
              'amount' in slotProps.data['payment-transaction']
            "
          >
            {{
              $filters.formatCurrency(
                slotProps.data["payment-transaction"]["amount"]
              )
            }}
          </div>
          <div
            class="text-end"
            v-if="
              slotProps.data['tx-type'] == 'axfer' &&
              'asset-transfer-transaction' in slotProps.data &&
              'amount' in slotProps.data['asset-transfer-transaction']
            "
          >
            {{
              $filters.formatCurrency(
                slotProps.data["asset-transfer-transaction"]["amount"],
                this.getAssetName(
                  slotProps.data["asset-transfer-transaction"]["asset-id"]
                ),

                getAssetDecimals(asset["asset-id"])
              )
            }}
          </div>
        </template></Column
      >
      <Column
        field="sender"
        :header="$t('acc_overview.sender')"
        :sortable="true"
        styleClass="not-show-at-start"
      ></Column>
      <Column
        field="payment-transaction.receiver"
        :header="$t('acc_overview.receiver')"
        :sortable="true"
        styleClass="not-show-at-start"
      ></Column>
      <Column
        field="receiver-rewards"
        :header="$t('acc_overview.receiver_rewards')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div
            class="text-end"
            v-if="slotProps.column.props.field in slotProps.data"
          >
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template></Column
      >
      <Column field="fee" :header="$t('acc_overview.fee')" :sortable="true"
        ><template #body="slotProps">
          <div
            class="text-end"
            v-if="slotProps.column.props.field in slotProps.data"
          >
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
        </template></Column
      >
      <Column
        field="confirmed-round"
        :header="$t('acc_overview.confirmed_round')"
        :sortable="true"
      >
      </Column>
    </DataTable>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
import { PrimeIcons } from "primevue/api";
import copy from "copy-to-clipboard";

import QRCodeVue3 from "qrcode-vue3";
export default {
  components: {
    MainLayout,
    QRCodeVue3,
  },
  data() {
    return {
      displayDeleteDialog: false,
      transactions: [],
      selection: null,
      assets: [],
      asset: "",
      icons: [PrimeIcons.COPY],
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
    rekeyedToInfo() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.account.rekeyedTo
      );
    },
    rekeyedMultisigParams() {
      const rekeyedInfo = this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.account.rekeyedTo
      );
      if (!rekeyedInfo) return null;
      return rekeyedInfo.params;
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
    account() {
      this.makeAssets();
    },
  },
  async mounted() {
    await this.reloadAccount();
    await this.makeAssets();
    this.prolong();
  },
  methods: {
    ...mapActions({
      accountInformation: "algod/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
      deleteAccount: "wallet/deleteAccount",
      searchForTransactions: "indexer/searchForTransactions",
      setTransaction: "wallet/setTransaction",
      getAsset: "indexer/getAsset",
      prolong: "wallet/prolong",
    }),

    async makeAssets() {
      this.assets = [];
      if (this.account && this.account.amount > 0) {
        this.assets.push({
          "asset-id": "",
          amount: this.account.amount,
          name: "ALG",
          decimals: 6,
          "unit-name": "",
        });
      }
      if (this.account) {
        for (let index in this.account.assets) {
          const asset = await this.getAsset({
            assetIndex: this.account.assets[index]["asset-id"],
          });
          if (asset) {
            this.assets.push({
              "asset-id": this.account.assets[index]["asset-id"],
              amount: this.account.assets[index]["amount"],
              name: asset["name"],
              decimals: asset["decimals"],
              "unit-name": asset["unit-name"],
            });
          }
        }
      }
    },
    getAssetSync(id) {
      const ret = this.$store.state.indexer.assets.find(
        (a) => a["asset-id"] == id
      );
      return ret;
    },
    getAssetName(id) {
      const asset = this.getAssetSync(id);
      if (asset) return asset["name"];
    },
    getAssetDecimals(id) {
      const asset = this.getAssetSync(id);
      if (asset) return asset["decimals"];
    },
    async reloadAccount() {
      await this.accountInformation({
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
    copyToClipboard(text) {
      if (copy(text)) {
        alert(this.$t("global.copied_to_clipboard"));
      }
    },
    async deleteAccountClick() {
      await this.deleteAccount({
        name: this.account.name,
        addr: this.account.addr,
      });
      this.$router.push("/accounts");
    },
  },
};
</script>