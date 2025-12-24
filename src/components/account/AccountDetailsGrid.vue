<template>
  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.name") }}
    </label>
    <div class="col-12 md:col-8">
      {{ account.name }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.type") }}
    </label>
    <div class="col-12 md:col-8">
      <AccountType :account="account" :accountData="accountData" />
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.address") }}
    </label>
    <div class="col-12 md:col-8">
      <Button
        size="small"
        severity="secondary"
        class="m-1"
        :title="t('global.copy_address')"
        @click="emit('copy-address')"
      >
        <i class="pi pi-copy" />
      </Button>
      {{ account.addr }}
    </div>
  </div>

  <div class="field grid vertical-align-top" v-if="accountData.rekeyedTo">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.rekeyedTo") }}
    </label>
    <div class="col-12 md:col-8">
      {{ accountData.rekeyedTo }}

      <div v-if="rekeyedToInfo">
        <AccountType :account="rekeyedToInfo" />
        <table v-if="rekeyedParams" class="w-full">
          <tbody>
            <tr>
              <th>{{ t("acc_overview.multisignature_threshold") }}:</th>
              <td>{{ rekeyedParams.threshold }}</td>
            </tr>
            <tr>
              <th>{{ t("acc_overview.multisignature_addresses") }}:</th>
              <td>{{ rekeyedParams.addrs }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="field grid vertical-align-top" v-if="account.type === 'ledger'">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.account0") }}
    </label>
    <div class="col-12 md:col-8">
      {{ account.addr0 }}
    </div>
  </div>

  <div class="field grid vertical-align-top" v-if="account.type === 'ledger'">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.slot") }}
    </label>
    <div class="col-12 md:col-8">
      {{ account.slot }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.amount") }}
    </label>
    <div class="col-12 md:col-8">
      {{ formatCurrency(accountData.amount) }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.amount_without_pending") }}
    </label>
    <div class="col-12 md:col-8">
      {{ formatCurrency(accountData["amount-without-pending-rewards"]) }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.rewards") }}
    </label>
    <div class="col-12 md:col-8">
      {{ formatCurrency(accountData["rewards"]) }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.pending_rewards") }}
    </label>
    <div class="col-12 md:col-8">
      {{ formatCurrency(accountData["pending-rewards"]) }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.reward_base") }}
    </label>
    <div class="col-12 md:col-8">
      {{ accountData["reward-base"] }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.round") }}
    </label>
    <div class="col-12 md:col-8">
      {{ accountData["round"] }}
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.status") }}
    </label>
    <div class="col-12 md:col-8">
      <div v-if="changeOnline">
        <ProgressSpinner style="width: 1em; height: 1em" strokeWidth="5" />
        {{ t("acc_overview.making_account_online") }}
      </div>
      <div v-else-if="changeOffline">
        <ProgressSpinner style="width: 1em; height: 1em" strokeWidth="5" />
        {{ t("acc_overview.making_account_offline") }}
      </div>
      <div v-else-if="hasParticipationHost">
        <Button
          severity="secondary"
          size="small"
          @click="emit('open-participation-dialog')"
        >
          {{ accountData["status"] ?? "?" }}
        </Button>
      </div>
      <div v-else>
        {{ accountData["status"] ?? "?" }}
      </div>
    </div>
  </div>

  <div class="field grid vertical-align-top" v-if="devMode">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.apps_local_state") }}
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

  <div class="field grid vertical-align-top" v-if="devMode">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.apps_total_schema") }}
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

  <div class="field grid vertical-align-top" v-if="devMode">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.created_apps") }}
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
      {{ t("acc_overview.multisignature_threshold") }}
    </label>
    <div class="col-12 md:col-8">
      {{ account.params?.threshold }}
    </div>
  </div>

  <div class="field grid vertical-align-top" v-if="account.params">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    >
      {{ t("acc_overview.multisignature_addresses") }}
    </label>
    <div class="col-12 md:col-8">
      <JsonViewer
        v-if="account.params?.addrs"
        :value="account.params?.addrs"
        copyable
        boxed
        sort
      />
    </div>
  </div>

  <div class="field grid vertical-align-top">
    <label
      class="col-12 mb-2 md:col-4 md:mb-0 font-bold vertical-align-top h-full"
    />
    <div class="col-12 md:col-8">
      <Button size="small" severity="secondary" @click="emit('refresh')">
        {{ t("acc_overview.refresh") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from "vue";
import { useI18n } from "vue-i18n";
import AccountType from "@/components/AccountType.vue";
import ProgressSpinner from "primevue/progressspinner";
import { JsonViewer } from "vue3-json-viewer";
import type { AccountNetworkData, PrivateAccount } from "@/types/account";

const props = defineProps<{
  account: PrivateAccount;
  accountData: AccountNetworkData;
  rekeyedToInfo?: PrivateAccount;
  changeOnline: boolean;
  changeOffline: boolean;
  devMode: boolean;
  hasParticipationHost: boolean;
}>();

const emit = defineEmits<{
  (e: "copy-address"): void;
  (e: "refresh"): void;
  (e: "open-participation-dialog"): void;
}>();

const { t } = useI18n();
const instance = getCurrentInstance();
const $filters = instance?.appContext.config.globalProperties.$filters as
  | { formatCurrency?: (...args: any[]) => unknown }
  | undefined;

const rekeyedParams = computed(() => props.rekeyedToInfo?.params ?? null);

const formatCurrency = (value?: number | bigint) => {
  if ($filters?.formatCurrency) {
    return $filters.formatCurrency(value);
  }
  return value ?? 0;
};
</script>
