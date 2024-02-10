<template>
  <MainLayout>
    <AccountTopMenu />

    <DataTable
      v-if="filters"
      :value="assets"
      responsive-layout="scroll"
      :paginator="true"
      :rows="20"
      :loading="loading"
      v-model:filters="filters"
      filterDisplay="menu"
      :globalFilterFields="['name', 'asset-id', 'amount']"
    >
      <template #header>
        <div class="flex justify-content-end" v-if="filters['global']">
          <span class="p-input-icon-left">
            <i class="pi pi-search" />
            <InputText
              v-model="filters['global'].value"
              placeholder="Keyword Search"
            />
          </span>
        </div>
      </template>
      <template #empty>
        {{ $t("acc_overview.no_assets") }}
      </template>
      <Column field="name" header="Name" :sortable="true">
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
      <Column field="asset-id" header="Id" :sortable="true">
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            placeholder="Search by asset id"
          />
        </template>
      </Column>
      <Column field="amount" header="Amount" :sortable="true">
        <template #body="slotProps">
          <div v-if="slotProps.data['asset-id'] > 0" class="text-right">
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field],
                getAssetName(slotProps.data["asset-id"]),
                getAssetDecimals(slotProps.data["asset-id"])
              )
            }}
          </div>
          <div v-else class="text-right">
            {{
              $filters.formatCurrency(
                slotProps.data[slotProps.column.props.field]
              )
            }}
          </div>
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
    </DataTable>
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import { mapActions } from "vuex";
import { PrimeIcons } from "primevue/api";
import copy from "copy-to-clipboard";
import AccountTopMenu from "../../components/AccountTopMenu.vue";
import { FilterMatchMode } from "primevue/api";

export default {
  components: {
    MainLayout,
    AccountTopMenu,
  },
  data() {
    return {
      displayDeleteDialog: false,
      displayOnlineOfflineDialog: false,
      transactions: [],
      selection: null,
      assets: [],
      asset: "",
      icons: [PrimeIcons.COPY],
      changeOnline: false,
      changeOffline: false,
      onlineRounds: 500000,
      loading: true,

      filters: {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        "asset-id": { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        amount: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      },
    };
  },
  computed: {
    canSign() {
      if (!this.account) return false;
      if (!this.accountData) return false;

      if (this.accountData.rekeyedTo) {
        if (!this.rekeyedToInfo) return false;

        return (
          this.rekeyedToInfo.sk ||
          this.rekeyedToInfo.params ||
          this.rekeyedToInfo.type == "ledger" ||
          this.rekeyedToInfo.type == "wc"
        );
      }

      return (
        this.account.sk ||
        this.account.params ||
        this.account.type == "ledger" ||
        this.account.type == "wc"
      );
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      );
    },
    accountData() {
      if (!this.account.data) return false;
      return this.account.data[this.$store.state.config.env];
    },
    lastActiveAccountAddr() {
      return this.$store.state.wallet.lastActiveAccount;
    },
    rekeyedToInfo() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.accountData.rekeyedTo
      );
    },
    rekeyedMultisigParams() {
      const rekeyedInfo = this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.accountData.rekeyedTo
      );
      if (!rekeyedInfo) return null;
      return rekeyedInfo.params;
    },
  },
  watch: {
    async selection() {
      await this.setTransaction({ transaction: this.selection });
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
      accountInformation: "indexer/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
      deleteAccount: "wallet/deleteAccount",
      searchForTransactions: "indexer/searchForTransactions",
      setTransaction: "wallet/setTransaction",
      getAsset: "indexer/getAsset",
      prolong: "wallet/prolong",
      setAccountOnline: "kmd/setAccountOnline",
      setAccountOffline: "kmd/setAccountOffline",
      openSuccess: "toast/openSuccess",
    }),
    async makeAssets() {
      this.loading = true;
      this.assets = [];
      if (this.accountData && this.accountData.amount > 0) {
        this.assets.push({
          "asset-id": "",
          amount: this.accountData.amount,
          name: "ALG",
          decimals: 6,
          "unit-name": "",
        });
      }
      if (this.accountData && this.accountData.assets) {
        for (const accountAsset of this.accountData.assets) {
          if (!accountAsset["asset-id"]) continue;
          const asset = await this.getAsset({
            assetIndex: accountAsset["asset-id"],
          });
          if (asset) {
            this.assets.push({
              "asset-id": accountAsset["asset-id"],
              amount: accountAsset["amount"],
              name: asset["name"],
              decimals: asset["decimals"],
              "unit-name": asset["unit-name"],
            });
          }
        }
      }
      this.loading = false;
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
      }).then(async (info) => {
        if (info) {
          this.updateAccount({ info });
          if (
            this.accountData &&
            this.accountData.rekeyedTo != this.accountData["auth-addr"]
          ) {
            const rekeyedTo = this.accountData["auth-addr"];
            console.error(
              `New rekey information detected: ${this.accountData.rekeyedTo} -> ${rekeyedTo}`
            );
            const info2 = {};
            info2.address = this.accountData.addr;
            info2.rekeyedTo = rekeyedTo;
            await this.updateAccount({ info: info2 });
            await this.openSuccess(
              `Information about rekeying to address ${rekeyedTo} has been stored`
            );
          }
        }
      });
      const searchData = await this.searchForTransactions({
        addr: this.$route.params.account,
      });
      if (searchData) {
        this.transactions = searchData.transactions;
      }
    },
    copyToClipboard(text) {
      if (copy(text)) {
        this.openSuccess(this.$t("global.copied_to_clipboard"));
      }
    },
    async deleteAccountClick() {
      await this.deleteAccount({
        name: this.account.name,
        addr: this.account.addr,
      });
      this.$router.push("/accounts");
    },
    async hideAccountClick() {
      if (this.account) {
        // add to current network automatically
        const info = { ...this.account };
        info.isHidden = !this.account.isHidden;
        await this.updateAccount({ info });
      }
    },
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    async setAccountOnlineAtParticipationNode() {
      this.displayOnlineOfflineDialog = false;
      this.changeOnline = true;
      if (
        await this.setAccountOnline({
          account: this.$route.params.account,
          rounds: this.onlineRounds,
        })
      ) {
        await this.sleep(5000);
        this.changeOnline = false;
        await this.reloadAccount();
        this.openSuccess("You have set the account to online mode");
      } else {
        this.changeOnline = false;
      }
    },
    async setAccountOfflineAtParticipationNode() {
      this.displayOnlineOfflineDialog = false;
      this.changeOffline = true;
      if (
        await this.setAccountOffline({ account: this.$route.params.account })
      ) {
        await this.sleep(5000);
        this.changeOffline = false;
        await this.reloadAccount();
        this.openSuccess("You have set the account to offline mode");
      } else {
        this.changeOffline = false;
      }
    },
  },
};
</script>
