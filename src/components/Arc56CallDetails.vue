<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { useStore } from "@/store";
import AlgorandAddress from "./AlgorandAddress.vue";
import {
  decodeArc56AppCall,
  applyCandidateToArgs,
  type DecodedArc56Call,
  type DecodedArc56Arg,
  type Arc56CandidateMatch,
} from "@/scripts/arc56/decode";
import type { ApplicationPrograms } from "@/store/algod";

// Deliberately narrow (just index + type, not the full algosdk.Transaction)
// so this prop stays structurally compatible with both
// ConnectRequestsTable's TransactionWrapper[] and SignAll's
// TransactionTableEntry[] without depending on either — and so it isn't
// tripped up by Vue's reactive() deep-readonly wrapping stripping methods
// off nested Transaction class instances.
interface GroupTxnEntry {
  index: number;
  type: string;
}

const props = defineProps<{
  appIndex: bigint;
  txn: algosdk.Transaction;
  currentIndex: number;
  groupTransactions?: GroupTxnEntry[];
}>();

const { t } = useI18n();
const store = useStore();

const loading = ref(false);
const decoded = ref<DecodedArc56Call | null>(null);
const selectedCandidateHash = ref<string>("");

const encodeAddressSafe = (
  addr: algosdk.Address | { publicKey?: Uint8Array } | undefined,
): string => {
  try {
    if (!addr) return "";
    if (addr instanceof algosdk.Address) return addr.toString();
    if (addr.publicKey) return algosdk.encodeAddress(addr.publicKey);
    return "";
  } catch {
    return "";
  }
};

const runDecode = async () => {
  loading.value = true;
  decoded.value = null;
  selectedCandidateHash.value = "";
  try {
    const call = props.txn.applicationCall;
    if (!call) {
      decoded.value = { trust: "not-abi", args: [] };
      return;
    }
    const programs = (await store.dispatch("algod/getApplicationPrograms", {
      appIndex: props.appIndex,
    })) as ApplicationPrograms | undefined;

    const accounts = (call.accounts ?? []).map((a) => encodeAddressSafe(a));
    const foreignAssets = (call.foreignAssets ?? []).map((a) => BigInt(a));
    const foreignApps = (call.foreignApps ?? []).map((a) => BigInt(a));
    const senderAddress = encodeAddressSafe(props.txn.sender);
    const precedingGroupTxns = (props.groupTransactions ?? [])
      .filter((g) => g.index < props.currentIndex)
      .sort((a, b) => a.index - b.index)
      .map((g) => ({ index: g.index, type: g.type }));

    decoded.value = await decodeArc56AppCall({
      appIndex: props.appIndex,
      approvalProgram: programs?.approvalProgram,
      appArgs: [...(call.appArgs ?? [])],
      accounts,
      foreignAssets,
      foreignApps,
      senderAddress,
      precedingGroupTxns,
    });
  } catch (error) {
    console.error("Failed to decode ARC-56 app call", error);
    decoded.value = { trust: "unknown", args: [] };
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.txn, props.appIndex],
  () => {
    void runDecode();
  },
  { immediate: true },
);

const trustSeverity = computed(() => {
  switch (decoded.value?.trust) {
    case "verified":
      return "success";
    case "verified-other-method":
      return "error";
    case "selector-only":
      return "warn";
    case "unknown":
      return "warn";
    default:
      return "secondary";
  }
});

const trustTitleKey = computed(() => {
  switch (decoded.value?.trust) {
    case "verified":
      return "arc56.trust_verified";
    case "verified-other-method":
      return "arc56.trust_verified_other_method";
    case "selector-only":
      return "arc56.trust_selector_only";
    case "unknown":
      return "arc56.trust_unknown";
    default:
      return "arc56.trust_not_abi";
  }
});

const trustDescKey = computed(() => {
  switch (decoded.value?.trust) {
    case "verified":
      return "arc56.trust_verified_desc";
    case "verified-other-method":
      return "arc56.trust_verified_other_method_desc";
    case "selector-only":
      return "arc56.trust_selector_only_desc";
    case "unknown":
      return "arc56.trust_unknown_desc";
    default:
      return "arc56.trust_not_abi_desc";
  }
});

const selectedCandidate = computed<Arc56CandidateMatch | undefined>(() =>
  decoded.value?.candidates?.find(
    (c) => c.approvalHash === selectedCandidateHash.value,
  ),
);

const displayArgs = computed<DecodedArc56Arg[]>(() => {
  if (!decoded.value) return [];
  if (selectedCandidate.value) {
    return applyCandidateToArgs(decoded.value, selectedCandidate.value);
  }
  return decoded.value.args;
});

const candidateOptions = computed(
  () =>
    decoded.value?.candidates?.map((c) => ({
      label: `${c.contract.name} (${c.approvalHash.slice(0, 10)}…)`,
      value: c.approvalHash,
    })) ?? [],
);

const stringifyValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    return `0x${Buffer.from(value).toString("hex")}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stringifyValue(v)).join(", ")}]`;
  }
  if (typeof value === "object") {
    return `{ ${Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${stringifyValue(v)}`)
      .join(", ")} }`;
  }
  return String(value);
};

const isPlainAddressArg = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" && arg.type === "address" && typeof arg.value === "string";

const isAddressArrayArg = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" &&
  arg.type === "address[]" &&
  Array.isArray(arg.value) &&
  arg.value.every((v) => typeof v === "string");
</script>

<template>
  <div class="arc56-call-details">
    <div v-if="loading" class="arc56-loading">
      <ProgressSpinner style="width: 1.5em; height: 1.5em" stroke-width="6" />
      {{ t("arc56.loading") }}
    </div>
    <template v-else-if="decoded">
      <Message :severity="trustSeverity" class="m-0 mb-2">
        <div class="arc56-trust-title">{{ t(trustTitleKey) }}</div>
        <div class="arc56-trust-desc">{{ t(trustDescKey) }}</div>
      </Message>

      <div v-if="decoded.contract" class="arc56-contract-name">
        <strong>{{ t("arc56.contract_name") }}:</strong> {{ decoded.contract.name }}
      </div>
      <div v-if="decoded.method || decoded.methodSignature" class="arc56-method">
        <strong>{{ t("arc56.method_signature") }}:</strong>
        {{ decoded.methodSignature }}
      </div>
      <div v-if="decoded.method?.desc" class="arc56-method-desc">
        {{ decoded.method.desc }}
      </div>

      <div
        v-if="decoded.candidates && decoded.candidates.length > 0"
        class="arc56-candidates"
      >
        <Message severity="secondary" class="m-0 mb-2">
          {{ t("arc56.candidates_desc", { count: decoded.candidates.length }) }}
        </Message>
        <label class="block mb-1">{{ t("arc56.select_candidate") }}</label>
        <Select
          v-model="selectedCandidateHash"
          :options="[{ label: t('arc56.no_candidate_selected'), value: '' }, ...candidateOptions]"
          option-label="label"
          option-value="value"
          class="w-full"
        />
        <Message v-if="selectedCandidate" severity="warn" class="m-0 mt-2">
          {{ t("arc56.candidate_unverified_notice") }}
        </Message>
      </div>

      <table
        v-if="displayArgs.length > 0"
        class="arc56-args-table"
      >
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t("arc56.argument_name") }}</th>
            <th>{{ t("arc56.argument_type") }}</th>
            <th>{{ t("arc56.argument_value") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="arg in displayArgs" :key="arg.argIndex">
            <td>{{ arg.argIndex + 1 }}</td>
            <td>
              {{ arg.name || "—" }}
              <div v-if="arg.desc" class="arc56-arg-desc">{{ arg.desc }}</div>
            </td>
            <td>
              <code>{{ arg.type }}</code>
              <div class="arc56-arg-kind" v-if="arg.kind !== 'value'">
                {{ t(`arc56.kind_${arg.kind}`) }}
              </div>
            </td>
            <td>
              <Message v-if="arg.error" severity="error" class="m-0">
                {{ arg.error }}
              </Message>
              <template v-else-if="arg.kind === 'account'">
                <AlgorandAddress :address="arg.address" link-explorer />
              </template>
              <template v-else-if="arg.kind === 'asset'">
                <a
                  :href="`https://algorand.scan.biatec.io/asset/${arg.assetId}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ arg.assetId }}
                  <i class="pi pi-external-link" />
                </a>
              </template>
              <template v-else-if="arg.kind === 'application'">
                <a
                  :href="`https://algorand.scan.biatec.io/application/${arg.applicationId}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ arg.applicationId }}
                  <i class="pi pi-external-link" />
                </a>
              </template>
              <template v-else-if="arg.kind === 'transaction'">
                {{ t("arc56.required_txn_type", { type: arg.requiredTxnType }) }}
                <span v-if="arg.matchedGroupTxn">
                  — {{ t("arc56.matched_group_txn", { index: arg.matchedGroupTxn.index + 1 }) }}
                </span>
              </template>
              <template v-else-if="isPlainAddressArg(arg)">
                <AlgorandAddress :address="arg.value as string" link-explorer />
              </template>
              <template v-else-if="isAddressArrayArg(arg)">
                <div v-for="(a, i) in (arg.value as string[])" :key="i">
                  <AlgorandAddress :address="a" link-explorer />
                </div>
              </template>
              <template v-else>
                <span class="arc56-arg-value">{{ stringifyValue(arg.value) }}</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="decoded.trust !== 'not-abi'" class="arc56-no-args">
        {{ t("arc56.no_arguments") }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.arc56-call-details {
  margin-bottom: 0.75rem;
}

.arc56-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.arc56-trust-title {
  font-weight: bold;
}

.arc56-trust-desc {
  opacity: 0.9;
}

.arc56-contract-name,
.arc56-method {
  margin-bottom: 0.25rem;
}

.arc56-method-desc {
  margin-bottom: 0.5rem;
  opacity: 0.85;
}

.arc56-candidates {
  margin-bottom: 0.75rem;
}

.arc56-args-table {
  width: 100%;
  border-collapse: collapse;
}

.arc56-args-table th,
.arc56-args-table td {
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--p-content-border-color);
  vertical-align: top;
}

.arc56-arg-desc {
  opacity: 0.75;
  font-size: 0.85em;
}

.arc56-arg-kind {
  opacity: 0.75;
  font-size: 0.85em;
}

.arc56-arg-value {
  word-break: break-all;
}
</style>
