<template>
  <MainLayout>
    <AccountTopMenu />

    <Card>
      <template #content>
        <div class="grid">
          <div class="col-6">
            <h1>
              {{ $t("acc_overview.title") }} -
              {{ $store.state.wallet.lastActiveAccountName }}
            </h1>
          </div>
          <div class="col-6">
            <div class="text-right">
              <Button
                severity="danger"
                size="small"
                class="m-2 align-items-end"
                @click="displayDeleteDialog = true"
              >
                <div>{{ $t("acc_overview.delete") }}</div>
              </Button>

              <Button
                severity="secondary"
                size="small"
                v-if="account"
                class="m-2 align-items-end"
                @click="hideAccountClick"
              >
                <div v-if="account.isHidden">Unhide account</div>
                <div v-else>Hide account</div>
              </Button>
            </div>
          </div>
        </div>

        <p>
          <Dialog
            v-model:visible="displayDeleteDialog"
            :header="$t('acc_overview.delete_header')"
            :modal="true"
            class="m-5"
          >
            <p>{{ $t("acc_overview.delete_confirm") }}</p>
            <p v-if="account">
              <b>{{ account.name }}</b>
            </p>
            <p v-if="account">
              {{ account.addr }}
            </p>

            <template #footer>
              <Button size="small" @click="displayDeleteDialog = false">
                {{ $t("global.cancel") }}
              </Button>
              <Button
                size="small"
                severity="danger"
                @click="deleteAccountClick"
              >
                {{ $t("acc_overview.delete_confirm_button") }}
              </Button>
            </template>
          </Dialog>
          <Dialog
            v-model:visible="displayOnlineOfflineDialog"
            :header="$t('onlineofflinedialog.header')"
            :modal="true"
            class="m-5"
          >
            <p>{{ $t("onlineofflinedialog.warning") }}</p>
            <InputNumber
              v-model="onlineRounds"
              class="w-full"
              type="number"
              :min="0"
              :max="2000000"
              :step="10000"
            />
            <p>
              {{ $t("onlineofflinedialog.host") }}:
              {{ $store.state.config.participation }}
            </p>
            <template #footer>
              <Button
                severity="secondary"
                size="small"
                @click="displayOnlineOfflineDialog = false"
              >
                {{ $t("global.cancel") }} </Button
              ><Button
                severity="primary"
                size="small"
                @click="setAccountOnlineAtParticipationNode"
              >
                {{ $t("onlineofflinedialog.makeOnline") }}
              </Button>
              <Button
                severity="danger"
                size="small"
                v-if="account['status'] == 'Online'"
                @click="setAccountOfflineAtParticipationNode"
              >
                {{ $t("onlineofflinedialog.makeOffline") }}
              </Button>
            </template>
          </Dialog>
        </p>

        <div class="grid" v-if="account && accountData">
          <div class="col-12 lg:col-9">
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.name") }}
              </label>
              <div class="col-12 md:col-8">
                {{ account["name"] }}
              </div>
            </div>

            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.type") }}
              </label>
              <div class="col-12 md:col-8">
                <AccountType
                  :account="account"
                  :accountData="accountData"
                ></AccountType>
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.address") }}
              </label>
              <div class="col-12 md:col-8">
                <Button
                  size="small"
                  severity="secondary"
                  class="m-1"
                  :title="$t('global.copy_address')"
                  @click="copyToClipboard(account.addr)"
                >
                  <i class="pi pi-copy" />
                </Button>
                {{ account.addr }}
              </div>
            </div>

            <div
              class="field grid vertical-align-top"
              v-if="accountData.rekeyedTo"
            >
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.rekeyedTo") }}
              </label>
              <div class="col-12 md:col-8">
                {{ accountData.rekeyedTo }}

                <div v-if="rekeyedToInfo">
                  <AccountType :account="rekeyedToInfo"></AccountType>
                  <table v-if="rekeyedToInfo.params" class="w-full">
                    <tr v-if="rekeyedToInfo.params">
                      <th>
                        {{ $t("acc_overview.multisignature_threshold") }}:
                      </th>
                      <td>{{ rekeyedToInfo.params.threshold }}</td>
                    </tr>
                    <tr v-if="rekeyedToInfo.params">
                      <th>
                        {{ $t("acc_overview.multisignature_addresses") }}:
                      </th>
                      <td>{{ rekeyedToInfo.params.addrs }}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>

            <div
              class="field grid vertical-align-top"
              v-if="account.type == 'ledger'"
            >
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.account0") }}
              </label>
              <div class="col-12 md:col-8">
                {{ account.addr0 }}
              </div>
            </div>
            <div
              class="field grid vertical-align-top"
              v-if="account.type == 'ledger'"
            >
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.slot") }}
              </label>
              <div class="col-12 md:col-8">
                {{ account.slot }}
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.amount") }}
              </label>
              <div class="col-12 md:col-8">
                {{ $filters.formatCurrency(accountData.amount) }}
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.amount_without_pending") }}
              </label>
              <div class="col-12 md:col-8">
                {{
                  $filters.formatCurrency(
                    accountData["amount-without-pending-rewards"]
                  )
                }}
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.rewards") }}
              </label>
              <div class="col-12 md:col-8">
                {{ $filters.formatCurrency(accountData["rewards"]) }}
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.pending_rewards") }}
              </label>
              <div class="col-12 md:col-8">
                {{ $filters.formatCurrency(accountData["pending-rewards"]) }}
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.reward_base") }}
              </label>
              <div class="col-12 md:col-8">
                {{ accountData["reward-base"] }}
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.round") }}
              </label>
              <div class="col-12 md:col-8">
                {{ accountData["round"] }}
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.status") }}
              </label>
              <div class="col-12 md:col-8">
                <div v-if="changeOnline">
                  <ProgressSpinner
                    style="width: 1em; height: 1em"
                    strokeWidth="5"
                  />
                  Setting your account to online state. Please wait a while
                </div>
                <div v-else-if="changeOffline">
                  <ProgressSpinner
                    style="width: 1em; height: 1em"
                    strokeWidth="5"
                  />
                  Setting your account to offline state. Please wait a while
                </div>
                <div v-else-if="$store.state.config.participation">
                  <Button
                    severity="secondary"
                    size="small"
                    @click="displayOnlineOfflineDialog = true"
                  >
                    {{ accountData["status"] ?? "?" }}
                  </Button>
                </div>
                <div v-else>
                  {{ accountData["status"] ?? "?" }}
                </div>
              </div>
            </div>
            <div
              class="field grid vertical-align-top"
              v-if="
                $store &&
                $store.state &&
                $store.state.config &&
                $store.state.config.dev
              "
            >
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.apps_local_state") }}
              </label>
              <div class="col-12 md:col-8">
                <JsonViewer
                  v-if="accountData['apps-local-state']"
                  :value="accountData['apps-local-state']"
                  copyable
                  boxed
                  sort
                />
              </div>
            </div>
            <div
              class="field grid vertical-align-top"
              v-if="
                $store &&
                $store.state &&
                $store.state.config &&
                $store.state.config.dev
              "
            >
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.apps_total_schema") }}
              </label>
              <div class="col-12 md:col-8">
                <JsonViewer
                  v-if="accountData['apps-total-schema']"
                  :value="accountData['apps-total-schema']"
                  copyable
                  boxed
                  sort
                />
              </div>
            </div>
            <div
              class="field grid vertical-align-top"
              v-if="
                $store &&
                $store.state &&
                $store.state.config &&
                $store.state.config.dev
              "
            >
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.created_apps") }}
              </label>
              <div class="col-12 md:col-8">
                <JsonViewer
                  v-if="accountData['created-apps']"
                  :value="accountData['created-apps']"
                  copyable
                  boxed
                  sort
                />
              </div>
            </div>
            <div class="field grid vertical-align-top" v-if="account.params">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.multisignature_threshold") }}
              </label>
              <div class="col-12 md:col-8">
                {{ account.params.threshold }}
              </div>
            </div>
            <div class="field grid vertical-align-top" v-if="account.params">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
                {{ $t("acc_overview.multisignature_addresses") }}
              </label>
              <div class="col-12 md:col-8">
                <JsonViewer
                  v-if="account.params.addrs"
                  :value="account.params.addrs"
                  copyable
                  boxed
                  sort
                />
              </div>
            </div>
            <div class="field grid vertical-align-top">
              <label
                class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
              >
              </label>
              <div class="col-12 md:col-8">
                <Button
                  size="small"
                  severity="secondary"
                  @click="reloadAccount"
                >
                  {{ $t("acc_overview.refresh") }}
                </Button>
              </div>
            </div>
          </div>
          <div class="col-12 lg:col-3 lg:text-right">
            <QRCodeVue3
              myclass="account-qr"
              class="d-md-none d-lg-block account-qr"
              :width="400"
              :height="400"
              :value="account.addr"
              :qr-options="{ errorCorrectionLevel: 'H' }"
              image="/img/algorand-algo-logo-96.png"
              :image-options="{
                hideBackgroundDots: true,
                imageSize: 0.4,
                margin: 10,
              }"
              :corners-square-options="{
                type: 'square',
                color: 'teal',
              }"
              :corners-dot-options="{
                type: 'square',
                color: 'teal',
                gradient: {
                  type: 'linear',
                  rotation: 0,
                  colorStops: [
                    { offset: 0, color: 'teal' },
                    { offset: 1, color: '#003030' },
                  ],
                },
              }"
              :dots-options="{
                type: 'square',
                color: 'teal',
                gradient: {
                  type: 'linear',
                  rotation: 0,
                  colorStops: [
                    { offset: 0, color: 'teal' },
                    { offset: 1, color: '#003030' },
                  ],
                },
              }"
            />
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import { mapActions } from "vuex";
import { PrimeIcons } from "primevue/api";
import copy from "copy-to-clipboard";
import AccountTopMenu from "../components/AccountTopMenu.vue";

import QRCodeVue3 from "qrcode-vue3";
import AccountType from "@/components/AccountType.vue";
import ProgressSpinner from "primevue/progressspinner";
import { VERIFY_FALLBACK_SERVER } from "@walletconnect/core";
import { JsonViewer } from "vue3-json-viewer";

export default {
  components: {
    MainLayout,
    QRCodeVue3,
    AccountTopMenu,
    AccountType,
    ProgressSpinner,
    JsonViewer,
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
    }),
    async makeAssets() {
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
      await this.prolong();
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
