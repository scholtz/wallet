<template>
  <MainLayout>
    <AccountTopMenu />

    <Card>
      <template #content>
        <AccountOverviewHeader
          :account="account"
          :account-name="$store.state.wallet.lastActiveAccountName"
          @delete="deleteAccountClick"
          @toggle-visibility="hideAccountClick"
        />

        <p>
          <Dialog
            v-model:visible="displayOnlineOfflineDialog"
            :header="$t('onlineofflinedialog.header')"
            :modal="true"
            class="m-5"
          >
            <div v-if="customKeyReg">
              <div class="field grid">
                <div class="col-12">
                  <Button
                    @click="processClipboardData"
                    :severity="
                      hasAnyParticipationData ? 'secondary' : 'primary'
                    "
                  >
                    {{ $t("onlineofflinedialog.fromclipboard") }}
                  </Button>
                </div>
              </div>
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
              <div class="field grid">
                <label for="stateProofKey" class="col-12 mb-2"> </label>
                <div class="col-12">
                  <Checkbox
                    binary
                    inputId="stakingRegistration1"
                    type="checkbox"
                    v-model="participationData.stakingRegistration"
                  />
                  <label for="stakingRegistration1" class="ml-1">{{
                    $t("onlineofflinedialog.stakingRegistration")
                  }}</label>
                </div>
              </div>
              <p>
                {{ $t("onlineofflinedialog.stakingHelp") }}
              </p>
            </div>
            <div v-else>
              <p>{{ $t("onlineofflinedialog.warning") }}</p>
              <div class="field grid">
                <label for="stateProofKey" class="col-12 mb-2">
                  {{ $t("onlineofflinedialog.onlineRounds") }}
                </label>
                <div class="col-12">
                  <InputNumber
                    v-model="onlineRounds"
                    class="w-full"
                    type="number"
                    :min="0"
                    :max="2000000"
                    :step="10000"
                  />
                </div>
              </div>

              <div class="field grid">
                <label for="stateProofKey" class="col-12 mb-2"> </label>
                <div class="col-12">
                  <Checkbox
                    binary
                    inputId="stakingRegistration2"
                    type="checkbox"
                    v-model="participationData.stakingRegistration"
                  />
                  <label for="stakingRegistration2" class="ml-1">{{
                    $t("onlineofflinedialog.stakingRegistration")
                  }}</label>
                </div>
              </div>
              <p>
                {{ $t("onlineofflinedialog.stakingHelp") }}
              </p>
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
                  accountData?.['status'] == 'Online' &&
                  !participationWizzard
                "
                @click="setAccountOfflineAtParticipationNode"
              >
                {{ $t("onlineofflinedialog.makeOffline") }}
              </Button>
              <Button
                severity="danger"
                size="small"
                v-if="isMultisig && accountData?.['status'] == 'Online'"
                @click="setAccountOfflineMsigAtParticipationNode"
              >
                {{ $t("onlineofflinedialog.makeOffline") }}
              </Button>
            </template>
          </Dialog>
        </p>

        <div class="grid" v-if="account && accountData">
          <div class="col-12 lg:col-9">
            <AccountDetailsGrid
              :account="account"
              :account-data="accountData"
              :rekeyed-to-info="rekeyedToInfo"
              :change-online="changeOnline"
              :change-offline="changeOffline"
              :dev-mode="devMode"
              :has-participation-host="hasParticipationHost"
              @copy-address="copyToClipboard(account.addr)"
              @refresh="reloadAccount"
              @open-participation-dialog="clickOpenParticipationDialog"
            />
          </div>
          <AccountQrCodePanel v-if="account" :address="account.addr" />
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import copy from "copy-to-clipboard";
import algosdk from "algosdk";
import type { SuggestedParams } from "algosdk";

import MainLayout from "../layouts/Main.vue";
import AccountTopMenu from "../components/AccountTopMenu.vue";
import AccountOverviewHeader from "@/components/account/AccountOverviewHeader.vue";
import AccountDetailsGrid from "@/components/account/AccountDetailsGrid.vue";
import AccountQrCodePanel from "@/components/account/AccountQrCodePanel.vue";
import type {
  AccountNetworkData,
  MultisigParams,
  ParticipationData,
  PrivateAccount,
} from "@/types/account";
import { ExtendedStoredAsset, StoredAsset } from "@/store/indexer";

const store = useStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const instance = getCurrentInstance();
const $filters = instance?.appContext.config.globalProperties.$filters;

const displayOnlineOfflineDialog = ref(false);
const transactions = ref<algosdk.indexerModels.Transaction[]>([]);
const selection = ref<any | null>(null);
const assets = ref<ExtendedStoredAsset[]>([]);
const changeOnline = ref(false);
const changeOffline = ref(false);
const onlineRounds = ref(500000);
const participationRealm = ref("");
const participationAuth = ref("");
const participationWizzard = ref(false);
const customKeyReg = ref(false);

const participationData = reactive<ParticipationData>({
  stakingRegistration: true,
  voteFirst: 0,
  voteLast: 0,
  voteKeyDilution: 0,
  selectionKey: "",
  voteKey: "",
  stateProofKey: "",
});

const accountAddressParam = computed(() => String(route.params.account ?? ""));

const account = computed<PrivateAccount | undefined>(() =>
  store.state.wallet.privateAccounts.find(
    (a: PrivateAccount) => a.addr === accountAddressParam.value
  )
);

const accountData = computed<AccountNetworkData | null>(() => {
  const acc = account.value;
  const env = store.state.config.env;
  if (!acc?.data || !env) {
    return null;
  }
  return acc.data[env] ?? null;
});

const devMode = computed(() => Boolean(store.state?.config?.dev));
const hasParticipationHost = computed(() =>
  Boolean(store.state?.config?.participation)
);

const rekeyedToInfo = computed<PrivateAccount | undefined>(() => {
  const target = accountData.value?.rekeyedTo;
  if (!target) return undefined;
  return store.state.wallet.privateAccounts.find(
    (a: PrivateAccount) => a.addr === target
  );
});

const rekeyedMultisigParams = computed<MultisigParams | null>(() => {
  const info = rekeyedToInfo.value;
  if (!info?.params) return null;
  return info.params;
});

const multisigParams = computed<MultisigParams | null>(() => {
  if (rekeyedToInfo.value) {
    return rekeyedMultisigParams.value;
  }
  return account.value?.params ?? null;
});

const isMultisig = computed(() => Boolean(multisigParams.value));

const hasAnyParticipationData = computed(
  () =>
    participationData.voteFirst > 0 ||
    participationData.voteLast > 0 ||
    participationData.voteKeyDilution > 0 ||
    !!participationData.selectionKey ||
    !!participationData.voteKey ||
    !!participationData.stateProofKey
);

const accountInformationAction = (payload: { addr: string }) =>
  store.dispatch("indexer/accountInformation", payload);
const updateAccountAction = (payload: { info: Record<string, unknown> }) =>
  store.dispatch("wallet/updateAccount", payload);
const deleteAccountAction = (payload: { name: string; addr: string }) =>
  store.dispatch("wallet/deleteAccount", payload);
const searchForTransactionsAction = (payload: {
  addr: string;
}): Promise<algosdk.indexerModels.TransactionsResponse | undefined> =>
  store.dispatch("indexer/searchForTransactions", payload);
const setTransactionAction = (payload: { transaction: unknown }) =>
  store.dispatch("wallet/setTransaction", payload);
const getAssetAction = (payload: {
  assetIndex: bigint;
}): Promise<StoredAsset | undefined> =>
  store.dispatch("indexer/getAsset", payload);
const prolongSession = () => store.dispatch("wallet/prolong");
const setAccountOnlineAction = (payload: {
  account: string;
  rounds: number;
  participationAuth: string;
  stakingRegistration: boolean;
}) => store.dispatch("participation/setAccountOnline", payload);
const getParticipationDataAction = (payload: {
  account: string;
  rounds: number;
  participationAuth: string;
}) => store.dispatch("participation/getParticipationData", payload);
const setAccountOfflineAction = (payload: { account: string }) =>
  store.dispatch("participation/setAccountOffline", payload);
const getAccountOfflineTxAction = (payload: { account: string }) =>
  store.dispatch("participation/getAccountOfflineTx", payload);
const getARC14ParticipationRealmAction = () =>
  store.dispatch("participation/getARC14ParticipationRealm");
const openSuccessAction = (message: string) =>
  store.dispatch("toast/openSuccess", message);
const signAuthTxAction = (payload: { account: string; realm: string }) =>
  store.dispatch("arc14/signAuthTx", payload);
const getAuthTxAction = (payload: { account: string; realm: string }) =>
  store.dispatch("arc14/getAuthTx", payload);
const returnToAction = (payload: string) =>
  store.dispatch("signer/returnTo", payload);
const getTransactionParamsAction = () =>
  store.dispatch("algod/getTransactionParams") as Promise<SuggestedParams>;
const setEnvAction = (payload: { env: string }) =>
  store.dispatch("config/setEnv", payload);

const makeAssets = async () => {
  assets.value = [];
  const data = accountData.value;
  if (!data) {
    return;
  }
  const baseAmount = BigInt(data.amount ?? 0);
  if (baseAmount > 0) {
    assets.value.push({
      assetId: 0n,
      amount: baseAmount,
      name: "ALG",
      decimals: 6,
      unitName: "",
      type: "Native",
      label: `ALG (Native token) Balance: ${$filters.formatCurrency(
        baseAmount,
        "ALG",
        6
      )}`,
    });
  }
  if (Array.isArray(data.assets)) {
    for (const accountAsset of data.assets) {
      if (!accountAsset.assetId) continue;
      const assetInfo = await getAssetAction({
        assetIndex: accountAsset.assetId,
      });
      if (assetInfo) {
        assets.value.push({
          assetId: accountAsset.assetId,
          amount: BigInt(accountAsset.amount),
          name: assetInfo.name,
          decimals: assetInfo.decimals,
          unitName: assetInfo.unitName,
          type: "ASA",
          label: `${assetInfo.name} (ASA ${
            accountAsset.assetId
          }) Balance: ${$filters.formatCurrency(
            BigInt(accountAsset.amount),
            assetInfo.unitName ?? assetInfo.name,
            assetInfo.decimals ?? 6
          )}`,
        });
      }
    }
  }
};

const reloadAccount = async () => {
  await prolongSession();
  const info = await accountInformationAction({
    addr: accountAddressParam.value,
  });
  if (info) {
    await updateAccountAction({ info });
    const data = accountData.value;
    if (data && data.rekeyedTo !== data["auth-addr"]) {
      const rekeyedTo = data["auth-addr"];
      const info2: Record<string, unknown> = {};
      info2.address = data.addr;
      info2.rekeyedTo = rekeyedTo;
      await updateAccountAction({ info: info2 });
      await openSuccessAction(
        `Information about rekeying to address ${rekeyedTo} has been stored`
      );
    }
  }
  const searchData = await searchForTransactionsAction({
    addr: accountAddressParam.value,
  });
  if (searchData) {
    transactions.value = searchData.transactions;
  }
};

const copyToClipboard = (text: string) => {
  if (copy(text)) {
    openSuccessAction(t("global.copied_to_clipboard"));
  }
};

const deleteAccountClick = async () => {
  const currentAccount = account.value;
  if (!currentAccount?.name) return;
  await deleteAccountAction({
    name: currentAccount.name,
    addr: currentAccount.addr,
  });
  await router.push("/accounts");
};

const hideAccountClick = async () => {
  if (!account.value) return;
  const info = { ...account.value } as Record<string, unknown>;
  info.isHidden = !account.value.isHidden;
  await updateAccountAction({ info });
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
  let binary = "";
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base642base64url = (input: string) =>
  input.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const clickFetchArc14Realm = async () => {
  await prolongSession();
  participationRealm.value = await getARC14ParticipationRealmAction();
  const env = store.state.config.env;
  const token =
    store.state.arc14?.address2chain2realm2token?.[env ?? ""]?.[
      accountAddressParam.value
    ]?.[participationRealm.value];
  if (token) {
    participationAuth.value = token;
  }
};

const clickSignArc14AuthTx = async () => {
  await prolongSession();
  participationAuth.value = await signAuthTxAction({
    account: accountAddressParam.value,
    realm: participationRealm.value,
  });
};

const clickSignArc14MsigAuthTx = async () => {
  await prolongSession();
  const txn = await getAuthTxAction({
    account: accountAddressParam.value,
    realm: participationRealm.value,
  });
  const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
  const urldataB64 = arrayBufferToBase64(encodedtxn);
  const urldataB64url = base642base64url(urldataB64);
  const pushTo = `/multisig/${accountAddressParam.value}/${urldataB64url}`;
  await returnToAction("Arc14Participation");
  await router.push(pushTo);
};

const clickLoadParticipationData = async () => {
  await prolongSession();
  changeOnline.value = true;
  const data = await getParticipationDataAction({
    account: accountAddressParam.value,
    rounds: onlineRounds.value,
    participationAuth: participationAuth.value,
  });
  if (data) {
    Object.assign(participationData, data);
  }
  participationData.stakingRegistration = true;
  changeOnline.value = false;
};

const encodeAndPush = async (txn: algosdk.Transaction, path: string) => {
  const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
  const urldataB64 = arrayBufferToBase64(encodedtxn);
  const urldataB64url = base642base64url(urldataB64);
  await router.push(`${path}/${urldataB64url}`);
};

const buildKeyRegistrationTxn = (
  sender: string,
  suggestedParams: SuggestedParams
) => {
  return algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
    stateProofKey: new Uint8Array(
      Buffer.from(participationData.stateProofKey, "base64")
    ),
    voteKey: new Uint8Array(Buffer.from(participationData.voteKey, "base64")),
    selectionKey: new Uint8Array(
      Buffer.from(participationData.selectionKey, "base64")
    ),
    voteFirst: participationData.voteFirst,
    voteLast: participationData.voteLast,
    voteKeyDilution: participationData.voteKeyDilution,
    suggestedParams,
    sender,
  });
};

const clickSignParticipationTx = async () => {
  await prolongSession();
  const suggestedParams =
    participationData.suggestedParams ?? (await getTransactionParamsAction());
  participationData.suggestedParams = suggestedParams;
  const txn = buildKeyRegistrationTxn(
    accountAddressParam.value,
    suggestedParams
  );
  if (participationData.stakingRegistration) {
    txn.fee = BigInt(2000000);
  }
  const path = isMultisig.value
    ? `/multisig/${accountAddressParam.value}`
    : `/sign/${accountAddressParam.value}`;
  await encodeAndPush(txn, path);
};

const clickSignCustomKeyRegTx = async () => {
  await prolongSession();
  const params = await getTransactionParamsAction();
  participationData.suggestedParams = params;
  const txn = buildKeyRegistrationTxn(accountAddressParam.value, params);
  if (participationData.stakingRegistration) {
    txn.fee = BigInt(2000000);
  }
  if (isMultisig.value) {
    await encodeAndPush(txn, `/multisig/${accountAddressParam.value}`);
  } else {
    await encodeAndPush(txn, `/sign/${accountAddressParam.value}`);
  }
};

const setAccountOnlineAtParticipationNode = async () => {
  await prolongSession();
  displayOnlineOfflineDialog.value = false;
  changeOnline.value = true;
  participationRealm.value = await getARC14ParticipationRealmAction();
  participationAuth.value = await signAuthTxAction({
    account: accountAddressParam.value,
    realm: participationRealm.value,
  });
  const success = await setAccountOnlineAction({
    account: accountAddressParam.value,
    rounds: onlineRounds.value,
    participationAuth: participationAuth.value,
    stakingRegistration: participationData.stakingRegistration,
  });
  if (success) {
    await sleep(5000);
    changeOnline.value = false;
    await reloadAccount();
    await openSuccessAction("You have set the account to online mode");
  } else {
    changeOnline.value = false;
  }
};

const setAccountOfflineAtParticipationNode = async () => {
  await prolongSession();
  displayOnlineOfflineDialog.value = false;
  changeOffline.value = true;
  const success = await setAccountOfflineAction({
    account: accountAddressParam.value,
  });
  if (success) {
    await sleep(5000);
    changeOffline.value = false;
    await reloadAccount();
    await openSuccessAction("You have set the account to offline mode");
  } else {
    changeOffline.value = false;
  }
};

const setAccountOfflineMsigAtParticipationNode = async () => {
  await prolongSession();
  displayOnlineOfflineDialog.value = false;
  const txn = await getAccountOfflineTxAction({
    account: accountAddressParam.value,
  });
  const encodedtxn = algosdk.encodeUnsignedTransaction(txn);
  const urldataB64 = arrayBufferToBase64(encodedtxn);
  const urldataB64url = base642base64url(urldataB64);
  const pushTo = `/multisig/${accountAddressParam.value}/${urldataB64url}`;
  await router.push(pushTo);
};

const clickCancel = () => {
  displayOnlineOfflineDialog.value = false;
  participationAuth.value = "";
  participationRealm.value = "";
  participationWizzard.value = false;
};

const clickOpenParticipationDialog = () => {
  displayOnlineOfflineDialog.value = true;
  participationWizzard.value = isMultisig.value;
  customKeyReg.value = false;
};

const processClipboardData = async () => {
  const clipboardData = await navigator.clipboard.readText();
  for (const line of clipboardData.split("\n")) {
    const parts = line.split(":");
    if (parts.length === 2) {
      const key = parts[0].trim();
      const value = parts[1].trim();
      if (key === "First round") {
        participationData.voteFirst = Number(value);
      }
      if (key === "Last round") {
        participationData.voteLast = Number(value);
      }
      if (key === "Key dilution") {
        participationData.voteKeyDilution = Number(value);
      }
      if (key === "Selection key") {
        participationData.selectionKey = value;
      }
      if (key === "Voting key") {
        participationData.voteKey = value;
      }
      if (key === "State proof key") {
        participationData.stateProofKey = value;
      }
    }
  }
};

watch(selection, async (newSelection) => {
  if (!newSelection) return;
  await setTransactionAction({ transaction: newSelection });
  if (newSelection.id) {
    await router.push(`/transaction/${newSelection.id}`);
  }
});

watch(account, async () => {
  await makeAssets();
});

onMounted(async () => {
  await reloadAccount();
  await makeAssets();
  await prolongSession();
  if (isMultisig.value) {
    participationWizzard.value = true;
  }
  if (!store.state.config.env || store.state.config.env === "undefined") {
    await setEnvAction({ env: "mainnet-v1.0" });
  }
  if (!store.state.config.participation && store.state.config.env) {
    await setEnvAction({ env: store.state.config.env });
  }
});
</script>
