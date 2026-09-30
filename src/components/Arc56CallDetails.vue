<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { useStore } from "@/store";
import AlgorandAddress from "./AlgorandAddress.vue";
import Arc56OwnerLinks from "./Arc56OwnerLinks.vue";
import {
  decodeAppCallWithOwners,
  ownersForDisplay,
  applyCandidateToArgs,
  arc56TrustSeverity,
  arc56TrustTitleKey,
  arc56TrustDescKey,
  safeTxId,
  type DecodedArc56Call,
  type DecodedArc56Arg,
  type DecodedAbiValue,
  type Arc56CandidateMatch,
} from "@/scripts/arc56/decode";
import type { Arc56Owner } from "@/scripts/arc56/types";
import { resolveApprovalProgram } from "@/composables/useArc56Summaries";
import { explorerAssetUrl, explorerApplicationUrl } from "@/scripts/explorer";

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

const assetUrl = (id: bigint | number | string) =>
  explorerAssetUrl(store.state.config.env, id);
const applicationUrl = (id: bigint | number | string) =>
  explorerApplicationUrl(store.state.config.env, id);

const loading = ref(false);
// shallowRef, not ref: `decoded` is always replaced wholesale (never
// mutated in place), and DecodedArc56Call's recursive DecodedAbiValue
// field makes Vue's deep UnwrapRef type transform hit TS's recursion limit
// ("Type instantiation is excessively deep") when wrapped in a normal ref.
const decoded = shallowRef<DecodedArc56Call | null>(null);
const selectedCandidateHash = ref<string>("");
// null = not looked up yet / no approvalHash to look up; [] = looked up, no
// known GitHub publisher (surfaced as a warning, not silently omitted).
const owners = shallowRef<Arc56Owner[] | null>(null);

// Guards against a stale runDecode() call overwriting a fresher one - e.g.
// ConnectRequestsTable rebuilds TransactionWrapper[] on every request-store
// update, which can re-trigger the watch below with a new (but
// content-identical) txn object before a previous decode has resolved.
let decodeGeneration = 0;

const runDecode = async () => {
  const generation = ++decodeGeneration;
  loading.value = true;
  decoded.value = null;
  selectedCandidateHash.value = "";
  owners.value = null;
  try {
    if (!props.txn.applicationCall) {
      decoded.value = { trust: "not-abi", args: [] };
      return;
    }
    const approvalProgram = await resolveApprovalProgram(store, props.txn, props.appIndex);
    if (generation !== decodeGeneration) return;

    const result = await decodeAppCallWithOwners(
      props.txn,
      props.appIndex,
      props.currentIndex,
      approvalProgram,
      props.groupTransactions ?? [],
    );
    if (generation !== decodeGeneration) return;
    if (!result) {
      decoded.value = { trust: "not-abi", args: [] };
      return;
    }
    decoded.value = result.decoded;
    // owners.value stays null (not looked up) when there's no approvalHash -
    // the template's `v-if="owners"` guard depends on that distinction to
    // avoid showing a "no publisher found" warning for a call that was
    // never eligible for a hash lookup at all.
    owners.value = ownersForDisplay(result.decoded, result.owners);
  } catch (error) {
    console.error("Failed to decode ARC-56 app call", error);
    if (generation === decodeGeneration) {
      decoded.value = { trust: "unknown", args: [] };
    }
  } finally {
    if (generation === decodeGeneration) {
      loading.value = false;
    }
  }
};

// Keyed on transaction identity (txID) plus appIndex, not object identity -
// ConnectRequestsTable/SignAll rebuild their transaction arrays on every
// store update even when the actual transaction hasn't changed, and this
// avoids re-running the decode (a real algod + registry round-trip) for a
// content-identical txn object.
watch(
  () => `${safeTxId(props.txn)}:${props.appIndex}`,
  () => {
    void runDecode();
  },
  { immediate: true },
);

const trustSeverity = computed(() => arc56TrustSeverity(decoded.value?.trust));
const trustTitleKey = computed(() => arc56TrustTitleKey(decoded.value?.trust));
const trustDescKey = computed(() => arc56TrustDescKey(decoded.value?.trust));

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

const stringifyValue = (value: DecodedAbiValue | undefined): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    return `0x${Buffer.from(value).toString("hex")}`;
  }
  if (value instanceof algosdk.Address) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stringifyValue(v)).join(", ")}]`;
  }
  if (typeof value === "number") return String(value);
  // Only the struct-naming plain-object shape (see DecodedAbiValue in
  // scripts/arc56/decode.ts) can reach this point, since every other member
  // of the union is handled above.
  return `{ ${Object.entries(value)
    .map(([k, v]) => `${k}: ${stringifyValue(v)}`)
    .join(", ")} }`;
};

const isPlainAddressArg = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" && arg.type === "address" && typeof arg.value === "string";

const isAddressArrayArg = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" &&
  arg.type === "address[]" &&
  Array.isArray(arg.value) &&
  arg.value.every((v) => typeof v === "string");

// Many ARC-56 contracts pass an asset/app ID as a plain uint64 rather than
// the ARC-4 "asset"/"application" reference type (reference types are
// capped at 8 entries in the foreign-apps/assets arrays, so contracts that
// need more just take a raw ID). We can't decode those as references, but
// the argument's own name/description usually says what it is — e.g.
// "assetId", "collateral asset", "appIndex" — so pattern-match on that text
// to still offer the same friendly, clickable treatment.
const tokenize = (text: string): string[] =>
  text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);

const looksLikeAssetField = (arg: DecodedArc56Arg): boolean =>
  tokenize(`${arg.name ?? ""} ${arg.desc ?? ""}`).some((w) =>
    w.startsWith("asset"),
  );

const APP_FIELD_TOKENS = new Set([
  "app",
  "apps",
  "application",
  "applications",
  "appid",
  "appindex",
]);

const looksLikeAppField = (arg: DecodedArc56Arg): boolean =>
  tokenize(`${arg.name ?? ""} ${arg.desc ?? ""}`).some((w) =>
    APP_FIELD_TOKENS.has(w),
  );

const isNumericLike = (v: DecodedAbiValue | undefined): v is bigint | number =>
  typeof v === "bigint" || typeof v === "number";

const isAssetLikeScalar = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" && isNumericLike(arg.value) && looksLikeAssetField(arg);

const isAssetLikeArray = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" &&
  Array.isArray(arg.value) &&
  arg.value.length > 0 &&
  arg.value.every((v) => isNumericLike(v)) &&
  looksLikeAssetField(arg);

const isAppLikeScalar = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" && isNumericLike(arg.value) && looksLikeAppField(arg);

const isAppLikeArray = (arg: DecodedArc56Arg): boolean =>
  arg.kind === "value" &&
  Array.isArray(arg.value) &&
  arg.value.length > 0 &&
  arg.value.every((v) => isNumericLike(v)) &&
  looksLikeAppField(arg);

const getAssetInfo = (id: bigint | number | undefined) => {
  if (id === undefined) return undefined;
  const normalized = BigInt(id);
  return store.state.indexer.assets.find(
    (a) => BigInt(a.assetId) === normalized,
  );
};

const assetLabel = (id: bigint | number | undefined): string => {
  const info = getAssetInfo(id);
  if (!info) return "";
  return info.unitName ? `${info.name ?? ""} (${info.unitName})` : info.name ?? "";
};

// Loads ASA details (name/unit/decimals) for every asset-like argument so
// the template can show them inline instead of a bare numeric ID — mirrors
// the existing `indexer/getAsset` caching pattern used by
// ConnectRequestsTable.vue/SignAll.vue for pay/axfer transactions. Re-runs
// whenever `displayArgs` changes (e.g. once the user applies an unverified
// candidate's argument names, which is the only time selector-only/
// verified-other-method calls have any names to pattern-match against).
const loadedAssetIds = new Set<string>();
const ensureAssetInfoLoaded = async (args: DecodedArc56Arg[]) => {
  const ids = new Set<bigint>();
  for (const arg of args) {
    if (isAssetLikeScalar(arg)) {
      ids.add(BigInt(arg.value as bigint | number));
    } else if (isAssetLikeArray(arg)) {
      for (const v of arg.value as (bigint | number)[]) {
        ids.add(BigInt(v));
      }
    } else if (arg.kind === "asset" && arg.assetId !== undefined) {
      ids.add(BigInt(arg.assetId));
    }
  }
  const toFetch = Array.from(ids).filter(
    (id) => !loadedAssetIds.has(id.toString()),
  );
  toFetch.forEach((id) => loadedAssetIds.add(id.toString()));
  await Promise.all(
    toFetch.map((assetIndex) =>
      store.dispatch("indexer/getAsset", { assetIndex }),
    ),
  );
};

watch(
  displayArgs,
  (args) => {
    void ensureAssetInfoLoaded(args);
  },
  { immediate: true },
);
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
      <div v-if="decoded.selectorHex || decoded.approvalHash" class="arc56-raw-identity">
        <div v-if="decoded.selectorHex">
          <strong>{{ t("arc56.raw_selector") }}:</strong> {{ decoded.selectorHex }}
        </div>
        <div v-if="decoded.approvalHash">
          <strong>{{ t("arc56.program_hash") }}:</strong> {{ decoded.approvalHash }}
        </div>
      </div>

      <div v-if="owners" class="arc56-owners">
        <strong v-if="owners.length > 0">{{ t("arc56.published_by") }}:</strong>
        <Arc56OwnerLinks :owners="owners" />
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
                  :href="assetUrl(arg.assetId!)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ arg.assetId }}
                  <span v-if="assetLabel(arg.assetId)"> ({{ assetLabel(arg.assetId) }})</span>
                  <i class="pi pi-external-link" />
                </a>
              </template>
              <template v-else-if="arg.kind === 'application'">
                <a
                  :href="applicationUrl(arg.applicationId!)"
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
              <template v-else-if="isAssetLikeScalar(arg)">
                <a
                  :href="assetUrl(arg.value as bigint | number)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ arg.value }}
                  <span v-if="assetLabel(arg.value as bigint | number)">
                    ({{ assetLabel(arg.value as bigint | number) }})</span
                  >
                  <i class="pi pi-external-link" />
                </a>
              </template>
              <template v-else-if="isAssetLikeArray(arg)">
                <div v-for="(id, i) in (arg.value as (bigint | number)[])" :key="i">
                  <a
                    :href="assetUrl(id)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ id }}
                    <span v-if="assetLabel(id)"> ({{ assetLabel(id) }})</span>
                    <i class="pi pi-external-link" />
                  </a>
                </div>
              </template>
              <template v-else-if="isAppLikeScalar(arg)">
                <a
                  :href="applicationUrl(arg.value as bigint | number)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ arg.value }}
                  <i class="pi pi-external-link" />
                </a>
              </template>
              <template v-else-if="isAppLikeArray(arg)">
                <div v-for="(id, i) in (arg.value as (bigint | number)[])" :key="i">
                  <a
                    :href="applicationUrl(id)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ id }}
                    <i class="pi pi-external-link" />
                  </a>
                </div>
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

.arc56-owners {
  margin-bottom: 0.5rem;
}

.arc56-method-desc {
  margin-bottom: 0.5rem;
  opacity: 0.85;
}

.arc56-raw-identity {
  margin-bottom: 0.5rem;
  font-family: monospace;
  font-size: 0.85em;
  opacity: 0.75;
  word-break: break-all;
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
