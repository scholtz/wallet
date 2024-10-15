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
                <div v-if="account.isHidden">
                  {{ $t("acc_overview.unhide_account") }}
                </div>
                <div v-else>{{ $t("acc_overview.hide_account") }}</div>
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
            <div v-if="customKeyReg">
              <div class="field grid">
                <label for="voteFirst" class="col-12 mb-2">
                  {{ $t("acc_overview.vote_first_round") }}
                </label>
                <div class="col-12">
                  <InputNumber
                    inputId="voteFirst"
                    v-model="participationData.voteFirst"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="voteLast" class="col-12 mb-2">
                  {{ $t("acc_overview.vote_last_round") }}
                </label>
                <div class="col-12">
                  <InputNumber
                    inputId="voteLast"
                    v-model="participationData.voteLast"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="voteKeyDilution" class="col-12 mb-2">
                  {{ $t("acc_overview.vote_key_dilution") }}
                </label>
                <div class="col-12">
                  <InputNumber
                    inputId="voteKeyDilution"
                    v-model="participationData.voteKeyDilution"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="selectionKey" class="col-12 mb-2">
                  {{ $t("acc_overview.selection_key") }}
                </label>
                <div class="col-12">
                  <InputText
                    id="selectionKey"
                    v-model="participationData.selectionKey"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="voteKey" class="col-12 mb-2">
                  {{ $t("acc_overview.vote_key") }}
                </label>
                <div class="col-12">
                  <InputText
                    id="voteKey"
                    v-model="participationData.voteKey"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="field grid">
                <label for="stateProofKey" class="col-12 mb-2">
                  {{ $t("acc_overview.stateproof_key") }}
                </label>
                <div class="col-12">
                  <InputText
                    id="stateProofKey"
                    v-model="participationData.stateProofKey"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
            <div v-else>
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
              <p v-if="participationRealm">
                {{ $t("acc_overview.realm") }} : {{ participationRealm }}
              </p>
              <p v-if="participationRealm && isMultisig && !participationAuth">
                {{ $t("acc_overview.arc14msig_process") }}
              </p>
              <p v-if="participationAuth">{{ $t("acc_overview.hasArc14") }}</p>
              <p v-if="changeOnline">
                {{ $t("acc_overview.generating_keys") }}
              </p>
            </div>
            <template #footer v-if="customKeyReg">
              <Button
                v-if="
                  !participationWizzard || (isMultisig && !participationRealm)
                "
                severity="primary"
                size="small"
                @click="clickSignCustomKeyRegTx"
              >
                {{ $t("acc_overview.button_sign_keyreg") }}
              </Button>
              <Button
                v-if="
                  !participationWizzard || (isMultisig && !participationRealm)
                "
                severity="secondary"
                size="small"
                @click="customKeyReg = !customKeyReg"
              >
                {{ $t("acc_overview.button_close_custom_keyreg") }}
              </Button>
            </template>
            <template #footer v-else>
              <Button severity="secondary" size="small" @click="clickCancel">
                {{ $t("global.cancel") }}
              </Button>
              <Button
                v-if="!participationWizzard"
                :severity="isMultisig ? 'primary' : 'secondary'"
                size="small"
                @click="participationWizzard = true"
              >
                {{ $t("acc_overview.button_activate_wizzard") }}
              </Button>
              <Button
                v-if="participationWizzard && !participationRealm"
                :severity="!participationRealm ? 'primary' : 'secondary'"
                size="small"
                @click="clickFetchArc14Realm"
              >
                {{ $t("acc_overview.button_fetch_realm") }}
              </Button>
              <Button
                v-if="
                  !isMultisig &&
                  participationWizzard &&
                  participationRealm &&
                  !participationAuth
                "
                severity="primary"
                size="small"
                @click="clickSignArc14AuthTx"
              >
                {{ $t("acc_overview.button_sign_arc14") }}
              </Button>
              <Button
                v-if="
                  isMultisig &&
                  participationWizzard &&
                  participationRealm &&
                  !participationAuth
                "
                severity="primary"
                size="small"
                @click="clickSignArc14MsigAuthTx"
              >
                {{ $t("acc_overview.button_sign_arc14_msig") }}
              </Button>
              <Button
                v-if="
                  participationWizzard &&
                  participationRealm &&
                  participationAuth &&
                  !participationData?.voteKey
                "
                severity="primary"
                size="small"
                @click="clickLoadParticipationData"
              >
                {{ $t("acc_overview.button_load_participatin_data") }}
              </Button>
              <Button
                v-if="
                  !participationWizzard || (isMultisig && !participationRealm)
                "
                severity="secondary"
                size="small"
                @click="customKeyReg = !customKeyReg"
              >
                {{ $t("acc_overview.button_custom_keyreg") }}
              </Button>
              <Button
                v-if="
                  participationWizzard &&
                  participationRealm &&
                  participationAuth &&
                  participationData?.voteKey
                "
                severity="primary"
                size="small"
                @click="clickSignParticipationTx"
              >
                {{ $t("acc_overview.button_sign_keyreg_tx") }}
              </Button>
              <Button
                v-if="!isMultisig && !participationWizzard"
                severity="primary"
                size="small"
                @click="setAccountOnlineAtParticipationNode"
              >
                {{ $t("onlineofflinedialog.makeOnline") }}
              </Button>
              <Button
                severity="danger"
                size="small"
                v-if="
                  !isMultisig &&
                  accountData['status'] == 'Online' &&
                  !participationWizzard
                "
                @click="setAccountOfflineAtParticipationNode"
              >
                {{ $t("onlineofflinedialog.makeOffline") }}
              </Button>
              <Button
                severity="danger"
                size="small"
                v-if="isMultisig && accountData['status'] == 'Online'"
                @click="setAccountOfflineMsigAtParticipationNode"
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
                  {{ $t("acc_overview.making_account_online") }}
                </div>
                <div v-else-if="changeOffline">
                  <ProgressSpinner
                    style="width: 1em; height: 1em"
                    strokeWidth="5"
                  />
                  {{ $t("acc_overview.making_account_offline") }}
                </div>
                <div v-else-if="$store.state.config.participation">
                  <Button
                    severity="secondary"
                    size="small"
                    @click="clickOpenParticipationDialog"
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
import algosdk from "algosdk";

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
      participationRealm: "",
      participationAuth: "",
      participationData: {},
      participationWizzard: false,
      customKeyReg: false,
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
    multisigParams() {
      if (this.rekeyedToInfo) return this.rekeyedMultisigParams;
      if (!this.account) return {};
      return this.account.params;
    },
    isMultisig() {
      return !!this.multisigParams;
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
    if (this.isMultisig) {
      this.participationWizzard = true;
    }
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
      setAccountOnline: "participation/setAccountOnline",
      getParticipationData: "participation/getParticipationData",
      setAccountOffline: "participation/setAccountOffline",
      getAccountOfflineTx: "participation/getAccountOfflineTx",
      getARC14ParticipationRealm: "participation/getARC14ParticipationRealm",
      openSuccess: "toast/openSuccess",
      signAuthTx: "arc14/signAuthTx",
      getAuthTx: "arc14/getAuthTx",
      returnTo: "signer/returnTo",
      getTransactionParams: "algod/getTransactionParams",
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
    _arrayBufferToBase64(buffer) {
      var binary = "";
      var bytes = new Uint8Array(buffer);
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
    base642base64url(input) {
      return input
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
    },
    async clickFetchArc14Realm() {
      await this.prolong();
      this.participationRealm = await this.getARC14ParticipationRealm();

      // check if we did go through step 2

      if (
        this.$store.state.arc14.address2chain2realm2token[
          this.$store.state.config.env
        ] &&
        this.$store.state.arc14.address2chain2realm2token[
          this.$store.state.config.env
        ][this.$route.params.account] &&
        this.$store.state.arc14.address2chain2realm2token[
          this.$store.state.config.env
        ][this.$route.params.account][this.participationRealm]
      ) {
        this.participationAuth =
          this.$store.state.arc14.address2chain2realm2token[
            this.$store.state.config.env
          ][this.$route.params.account][this.participationRealm];
      }
    },
    async clickSignArc14AuthTx() {
      await this.prolong();
      this.participationAuth = await this.signAuthTx({
        account: this.$route.params.account,
        realm: this.participationRealm,
      });
    },
    async clickSignArc14MsigAuthTx() {
      await this.prolong();
      const txn = await this.getAuthTx({
        account: this.$route.params.account,
        realm: this.participationRealm,
      });
      const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
      const urldataB64 = this._arrayBufferToBase64(encodedtxn);
      const urldataB64url = this.base642base64url(urldataB64);
      const pushTo = `/multisig/${this.$route.params.account}/${urldataB64url}`;
      await this.returnTo("Arc14Participation");

      this.$router.push(pushTo);
    },
    async clickLoadParticipationData() {
      await this.prolong();
      this.changeOnline = true;
      this.participationData = await this.getParticipationData({
        account: this.$route.params.account,
        rounds: this.onlineRounds,
        participationAuth: this.participationAuth,
      });
      this.changeOnline = false;
    },
    async clickSignParticipationTx() {
      await this.prolong();
      if (this.isMultisig) {
        const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(
          this.participationData
        );

        const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
        const urldataB64 = this._arrayBufferToBase64(encodedtxn);
        const urldataB64url = this.base642base64url(urldataB64);
        const pushTo = `/multisig/${this.$route.params.account}/${urldataB64url}`;
        this.$router.push(pushTo);
      } else {
        const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(
          this.participationData
        );

        const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
        const urldataB64 = this._arrayBufferToBase64(encodedtxn);
        const urldataB64url = this.base642base64url(urldataB64);
        const pushTo = `/sign/${this.$route.params.account}/${urldataB64url}`;
        this.$router.push(pushTo);
      }
    },
    async clickSignCustomKeyRegTx() {
      await this.prolong();
      const params = await this.getTransactionParams();
      this.participationData.suggestedParams = params;
      this.participationData.from = this.$route.params.account;

      if (this.isMultisig) {
        const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(
          this.participationData
        );

        const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
        const urldataB64 = this._arrayBufferToBase64(encodedtxn);
        const urldataB64url = this.base642base64url(urldataB64);
        const pushTo = `/multisig/${this.$route.params.account}/${urldataB64url}`;
        this.$router.push(pushTo);
      } else {
        const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(
          this.participationData
        );

        const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
        const urldataB64 = this._arrayBufferToBase64(encodedtxn);
        const urldataB64url = this.base642base64url(urldataB64);
        const pushTo = `/sign/${this.$route.params.account}/${urldataB64url}`;
        this.$router.push(pushTo);
      }
    },
    async setAccountOnlineAtParticipationNode() {
      await this.prolong();
      this.displayOnlineOfflineDialog = false;
      this.changeOnline = true;
      this.participationRealm = await this.getARC14ParticipationRealm();
      this.participationAuth = await this.signAuthTx({
        account: this.$route.params.account,
        realm: this.participationRealm,
      });
      if (
        await this.setAccountOnline({
          account: this.$route.params.account,
          rounds: this.onlineRounds,
          participationAuth: this.participationAuth,
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
      await this.prolong();
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
    async setAccountOfflineMsigAtParticipationNode() {
      await this.prolong();
      this.displayOnlineOfflineDialog = false;
      const txn = await this.getAccountOfflineTx({
        account: this.$route.params.account,
      });
      const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
      const urldataB64 = this._arrayBufferToBase64(encodedtxn);
      const urldataB64url = this.base642base64url(urldataB64);
      const pushTo = `/multisig/${this.$route.params.account}/${urldataB64url}`;
      this.$router.push(pushTo);
    },
    clickCancel() {
      this.displayOnlineOfflineDialog = false;
      this.participationAuth = "";
      this.participationRealm = "";
      this.participationWizzard = false;
    },
    clickOpenParticipationDialog() {
      this.displayOnlineOfflineDialog = true;
      if (this.isMultisig) {
        this.participationWizzard = true;
      } else {
        this.participationWizzard = false;
      }
      this.customKeyReg = false;
    },
  },
};
</script>
