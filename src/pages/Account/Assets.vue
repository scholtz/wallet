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
      :globalFilterFields="['name', 'asset-id', 'amount', 'type']"
    >
      <template #header>
        <div class="flex justify-content-end" v-if="filters['global']">
          <span class="p-input-icon-left">
            <i class="pi pi-search" />
            <InputText
              v-model="filters['global'].value"
              :placeholder="$t('global.keyword_search')"
            />
          </span>
        </div>
      </template>
      <template #empty>
        {{ $t("acc_overview.no_assets") }}
      </template>
      <Column
        field="name"
        :header="$t('acc_overview_assets.name')"
        :sortable="true"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('acc_overview_assets.search_by_name')"
          />
        </template>
      </Column>
      <Column
        field="type"
        :header="$t('acc_overview_assets.type')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div v-if="slotProps.data.type == 'Native'">
            <Badge severity="primary" value="Native"></Badge>
          </div>
          <div v-else-if="slotProps.data['type'] == 'ASA'">
            <Badge severity="info" value="ASA"></Badge>
          </div>
          <div v-else-if="slotProps.data['type'] == 'ARC200'">
            <Badge severity="success" value="ARC200"></Badge>
          </div>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('acc_overview_assets.search_by_type')"
          />
        </template>
      </Column>
      <Column
        field="asset-id"
        :header="$t('acc_overview_assets.id')"
        :sortable="true"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            placeholder="Search by asset id"
            :placeholder="$t('acc_overview_assets.search_by_id')"
          />
        </template>
      </Column>
      <Column
        field="amount"
        :header="$t('acc_overview_assets.amount')"
        :sortable="true"
      >
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
            :placeholder="$t('acc_overview_assets.search_by_amount')"
          />
        </template>
      </Column>
      <Column :header="$t('acc_overview_assets.actions')" :sortable="true">
        <template #body="slotProps">
          <Button class="m-1" size="small" @click="refresh(slotProps.data)">
            <i class="pi pi-refresh"></i>
          </Button>
          <RouterLink
            :to="
              '/accounts/pay/' +
              $store.state.wallet.lastActiveAccount +
              '/' +
              slotProps.data['asset-id']
            "
          >
            <Button
              class="m-1"
              size="small"
              @click="refresh(slotProps.data)"
              :title="$t('acc_overview.pay')"
            >
              <i class="pi pi-send"></i>
            </Button>
          </RouterLink>
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
import Badge from "primevue/badge";
import Contract from "arc200js";
export default {
  components: {
    MainLayout,
    AccountTopMenu,
    Badge,
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
        type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
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
      if (!this.account) return false;
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
      getAlgod: "algod/getAlgod",
      getIndexer: "indexer/getIndexer",
      updateArc200Balance: "wallet/updateArc200Balance",
    }),
    async makeAssets() {
      this.loading = true;
      this.assets = [];
      if (this.accountData && this.accountData.amount > 0) {
        this.assets.push({
          "asset-id": "",
          amount: this.accountData.amount,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": "",
          type: "Native",
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
              type: "ASA",
            });
          }
        }
      }
      if (this.accountData && this.accountData.arc200) {
        for (const accountAsset of Object.values(this.accountData.arc200)) {
          this.assets.push({
            "asset-id": Number(accountAsset.arc200id),
            amount: Number(accountAsset.balance),
            name: accountAsset.name,
            decimals: Number(accountAsset.decimals),
            "unit-name": accountAsset.symbol,
            type: "ARC200",
          });
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
    async refresh(data) {
      if (data.type == "ARC200") {
        console.log("ARC200 reload", data);
        this.reloadArc200AccountBalance(data);
      } else {
        console.log("reload", data);
        return await this.reloadAccount();
      }
    },
    async reloadArc200AccountBalance(data) {
      if (data.type != "ARC200") {
        console.error("Not arc200 asset", data);
      }
      const algodClient = await this.getAlgod();
      const indexerClient = await this.getIndexer();
      console.log("data.arc200id", data["asset-id"], data);
      const contract = new Contract(
        data["asset-id"],
        algodClient,
        indexerClient
      );
      var balance = await contract.arc200_balanceOf(this.account.addr);
      if (!balance.success) {
        this.openError("Failed to fetch ARC200 balance");
        return;
      }
      await this.updateArc200Balance({
        addr: this.account.addr,
        arc200Id: data["asset-id"],
        balance: balance.returnValue,
      });
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
