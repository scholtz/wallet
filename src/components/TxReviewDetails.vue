<template>
  <div v-if="txn" data-testid="tx-review-details">
    <!-- What an asset configuration / freeze / key registration does (AW-2026-081/-113): never
         just its type. Read from algosdk v3's nested fields. -->
    <div v-if="summary" class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">{{ $t("connect.type") }}</label>
      <div class="col-12 md:col-10">
        <Message
          :severity="summary.danger ? 'error' : 'warn'"
          class="m-0"
          data-testid="sign-special-summary"
        >
          {{ $t("connect." + summary.key, summary.params) }}
        </Message>
      </div>
    </div>
    <template v-if="assetConfig">
      <div
        v-for="role in assetRoles"
        :key="role.key"
        class="field grid"
        :data-testid="'sign-asset-role-' + role.key"
      >
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">{{ role.label }}</label>
        <div class="col-12 md:col-10">
          <AlgorandAddress v-if="role.address" :address="role.address" />
          <span v-else>{{ $t("connect.asset_role_removed") }}</span>
        </div>
      </div>
      <div v-if="assetConfig.clawback" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold"></label>
        <div class="col-12 md:col-10">
          <Message severity="error" class="m-0">
            {{ $t("connect.asset_clawback_warning") }}
          </Message>
        </div>
      </div>
      <div v-if="assetConfig.kind === 'create'" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">{{ $t("connect.asset") }}</label>
        <div class="col-12 md:col-10" data-testid="sign-asset-properties">
          {{
            $t("connect.asset_properties", {
              name: assetConfig.assetName,
              unit: assetConfig.unitName,
              total: assetConfig.total,
              decimals: assetConfig.decimals,
            })
          }}
          <div v-if="assetConfig.defaultFrozen">{{ $t("connect.asset_default_frozen") }}</div>
        </div>
      </div>
    </template>
    <template v-if="keyReg">
      <div v-if="keyReg.voteFirst !== undefined" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.keyreg_rounds") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-keyreg-rounds">
          {{ keyReg.voteFirst }} - {{ keyReg.voteLast }}
        </div>
      </div>
      <div v-if="keyReg.voteKey" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.keyreg_vote_key") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-keyreg-vote-key">
          <code class="break-all">{{ keyReg.voteKey }}</code>
        </div>
      </div>
      <div v-if="keyReg.selectionKey" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.keyreg_selection_key") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-keyreg-selection-key">
          <code class="break-all">{{ keyReg.selectionKey }}</code>
        </div>
      </div>
      <div v-if="keyReg.stateProofKey" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.keyreg_state_proof_key") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-keyreg-state-proof-key">
          <code class="break-all">{{ keyReg.stateProofKey }}</code>
        </div>
      </div>
      <div v-if="keyReg.voteKeyDilution" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.keyreg_dilution") }}
        </label>
        <div class="col-12 md:col-10">{{ keyReg.voteKeyDilution }}</div>
      </div>
    </template>
    <!-- Clawback: the asset is taken from this account, not from the sender. -->
    <div v-if="transfer?.assetSender" class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
        {{ $t("connect.clawback_from") }}
      </label>
      <div class="col-12 md:col-10">
        <Message severity="error" class="m-0">
          <AlgorandAddress :address="transfer.assetSender" />
          {{ $t("connect.clawback_warning") }}
        </Message>
      </div>
    </div>
    <div v-if="lease" class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">{{ $t("connect.lease") }}</label>
      <div class="col-12 md:col-10" data-testid="sign-lease">
        <code class="break-all">{{ lease }}</code>
      </div>
    </div>
    <template v-if="txn.type === 'appl' && txn.applicationCall">
      <div class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("pay.application_id") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-app-id">
          {{
            txn.applicationCall.appIndex
              ? txn.applicationCall.appIndex.toString()
              : `0 (${$t("pay.application_create")})`
          }}
        </div>
      </div>
      <div class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.on_complete") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-app-on-complete">
          {{ algosdk.OnApplicationComplete[txn.applicationCall.onComplete ?? 0] }}
        </div>
      </div>
      <div v-if="accessList.length" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.app_access") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-app-access">
          <div v-for="(line, index) in accessList" :key="index">{{ line }}</div>
        </div>
      </div>
      <div v-if="rejectVersion !== undefined" class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
          {{ $t("connect.app_reject_version") }}
        </label>
        <div class="col-12 md:col-10" data-testid="sign-app-reject-version">
          {{ rejectVersion }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import Message from "primevue/message";
import AlgorandAddress from "./AlgorandAddress.vue";
import {
  describeAssetConfig,
  describeKeyReg,
  describeLease,
  summarizeSpecialTransaction,
} from "@/scripts/txDetails";
import {
  describeAccessList,
  describeRejectVersion,
  describeTransfer,
  type ReviewTxnLike,
} from "@/scripts/txReview";
import type { DetailTxnLike } from "@/scripts/txDetails";

// Structural, so a template-unwrapped ref (a deep-readonly view of a Transaction) is accepted too.
const props = defineProps<{ txn?: (DetailTxnLike & ReviewTxnLike) | null }>();
const { t } = useI18n();

const summary = computed(() => (props.txn ? summarizeSpecialTransaction(props.txn) : undefined));
const assetConfig = computed(() => (props.txn ? describeAssetConfig(props.txn) : undefined));
const keyReg = computed(() => (props.txn ? describeKeyReg(props.txn) : undefined));
const lease = computed(() => (props.txn ? describeLease(props.txn) : undefined));
const transfer = computed(() => describeTransfer(props.txn));
const accessList = computed(() => describeAccessList(props.txn));
const rejectVersion = computed(() => describeRejectVersion(props.txn));
const assetRoles = computed(() => {
  const cfg = assetConfig.value;
  if (!cfg) return [];
  return [
    { key: "manager", label: t("connect.asset_manager"), address: cfg.manager },
    { key: "reserve", label: t("connect.asset_reserve"), address: cfg.reserve },
    { key: "freeze", label: t("connect.asset_freeze_role"), address: cfg.freeze },
    { key: "clawback", label: t("connect.asset_clawback_role"), address: cfg.clawback },
  ];
});
</script>
