<template>
  <div class="sim-panel">
    <div class="sim-panel-title">
      <i class="pi pi-bolt" />
      {{ $t("connect.simulation_title") }}
      <Button
        v-if="status !== 'loading'"
        icon="pi pi-refresh"
        text
        rounded
        size="small"
        :aria-label="$t('connect.simulation_rerun')"
        @click="runSimulation"
      />
    </div>

    <div v-if="status === 'loading'" class="sim-panel-loading">
      <ProgressSpinner style="width: 1rem; height: 1rem" stroke-width="6" />
      {{ $t("connect.simulation_loading") }}
    </div>

    <Message v-else-if="status === 'error'" severity="error" :closable="false">
      {{ $t("connect.simulation_failed") }}: {{ errorMessage }}
    </Message>

    <template v-else-if="status === 'success'">
      <Message v-if="failureMessage" severity="error" :closable="false">
        {{ $t("connect.simulation_txn_failed") }}: {{ failureMessage }}
      </Message>
      <Message v-else severity="success" :closable="false">
        {{ $t("connect.simulation_success") }}
      </Message>

      <DataTable
        v-if="displayRows.length"
        :value="displayRows"
        size="small"
        class="sim-panel-table"
      >
        <Column :header="$t('connect.app')">
          <template #body="slotProps">
            {{ slotProps.data.appIndex.toString() }}
            <div v-if="slotProps.data.contractName" class="sim-panel-contract-name">
              {{ slotProps.data.contractName }}
            </div>
          </template>
        </Column>
        <Column :header="$t('connect.simulation_scope')">
          <template #body="slotProps">
            <Tag
              :severity="slotProps.data.scope === 'global' ? 'info' : 'secondary'"
              :value="
                slotProps.data.scope === 'global'
                  ? $t('connect.simulation_scope_global')
                  : $t('connect.simulation_scope_local')
              "
            />
          </template>
        </Column>
        <Column v-if="hasLocalRows" :header="$t('connect.simulation_account')">
          <template #body="slotProps">
            <AlgorandAddress
              v-if="slotProps.data.account"
              :address="slotProps.data.account"
            />
          </template>
        </Column>
        <Column :header="$t('connect.simulation_key')">
          <template #body="slotProps">
            {{ slotProps.data.key }}
            <div v-if="slotProps.data.keyDesc" class="sim-panel-key-desc">
              {{ slotProps.data.keyDesc }}
            </div>
          </template>
        </Column>
        <Column :header="$t('connect.simulation_action')">
          <template #body="slotProps">
            <Tag
              :severity="slotProps.data.action === 'delete' ? 'danger' : 'success'"
              :value="
                slotProps.data.action === 'delete'
                  ? $t('connect.simulation_action_delete')
                  : $t('connect.simulation_action_set')
              "
            />
          </template>
        </Column>
        <Column :header="$t('connect.simulation_value')" field="value" />
      </DataTable>
      <div v-else class="sim-panel-empty">
        {{ $t("connect.simulation_no_state_changes") }}
      </div>
    </template>

    <div class="sim-panel-disclaimer">
      {{ $t("connect.simulation_disclaimer") }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { computed, ref, watch } from "vue";
import Tag from "primevue/tag";
import AlgorandAddress from "./AlgorandAddress.vue";
import { useStore } from "../store";
import {
  groupTransactionsByGroupId,
  summarizeAppStateChanges,
  type AppStateChangeRow,
} from "../scripts/simulateStateChanges";
import {
  fetchArc56SpecByProgramHash,
  sha256Hex,
} from "../scripts/arc56/registry";
import { resolveStateKeyInfo, decodeArc56StateValue } from "../scripts/arc56/state";
import type { Arc56Contract } from "../scripts/arc56/types";
import type { ApplicationPrograms } from "../store/algod";

const props = defineProps<{
  transactions: algosdk.Transaction[];
}>();

const store = useStore();

const status = ref<"idle" | "loading" | "success" | "error">("idle");
const errorMessage = ref("");
const failureMessage = ref("");
const rows = ref<AppStateChangeRow[]>([]);
// appIndex.toString() -> resolved contract, or null once a lookup found nothing.
const arc56Contracts = ref<Record<string, Arc56Contract | null>>({});

const hasLocalRows = computed(() =>
  rows.value.some((row) => row.scope === "local"),
);

interface DisplayRow extends AppStateChangeRow {
  contractName?: string;
  keyDesc?: string;
}

// Overlays ARC-56 state-key metadata (when the calling app's approval
// program is registered) onto the raw simulation rows: the human variable
// name instead of a base64/hex key, and the value re-decoded against its
// declared ABI/AVM type instead of the untyped byte-shape fallback - which
// matters most for values like a uint256 that would otherwise only ever show
// as an undecipherable 64-hex-char string.
const displayRows = computed<DisplayRow[]>(() =>
  rows.value.map((row) => {
    const contract = arc56Contracts.value[row.appIndex.toString()];
    if (!contract) return row;

    const display: DisplayRow = { ...row, contractName: contract.name };
    const keyInfo = resolveStateKeyInfo(contract, row.scope, row.keyRaw);
    if (!keyInfo) return display;

    display.key = keyInfo.name;
    display.keyDesc = keyInfo.desc;

    if (row.action === "set") {
      if (row.valueBytesRaw !== undefined) {
        const decoded = decodeArc56StateValue(
          keyInfo.valueType,
          new Uint8Array(Buffer.from(row.valueBytesRaw, "base64")),
          contract.structs ?? {},
        );
        if (decoded) display.value = decoded.display;
      } else if (row.valueUint !== undefined && keyInfo.valueType === "bool") {
        display.value = row.valueUint !== 0n ? "true" : "false";
      }
    }

    return display;
  }),
);

const signature = computed(() =>
  props.transactions
    .map((txn) => {
      try {
        return txn.txID();
      } catch {
        return "";
      }
    })
    .join(","),
);

const ensureArc56Loaded = async (appIndexes: Iterable<bigint>) => {
  const toFetch = Array.from(new Set(appIndexes)).filter(
    (appIndex) => !(appIndex.toString() in arc56Contracts.value),
  );
  if (toFetch.length === 0) return;
  await Promise.all(
    toFetch.map(async (appIndex) => {
      let contract: Arc56Contract | null = null;
      try {
        const programs = (await store.dispatch("algod/getApplicationPrograms", {
          appIndex,
        })) as ApplicationPrograms | undefined;
        if (programs?.approvalProgram && programs.approvalProgram.length > 0) {
          const hash = await sha256Hex(programs.approvalProgram);
          contract = await fetchArc56SpecByProgramHash(hash, "approval");
        }
      } catch (error) {
        console.error("Failed to load ARC-56 spec for state decoding", error);
      }
      arc56Contracts.value = { ...arc56Contracts.value, [appIndex.toString()]: contract };
    }),
  );
};

const runSimulation = async () => {
  if (props.transactions.length === 0) {
    status.value = "idle";
    rows.value = [];
    return;
  }
  status.value = "loading";
  errorMessage.value = "";
  failureMessage.value = "";
  rows.value = [];
  try {
    const groups = groupTransactionsByGroupId(props.transactions);
    const encodedGroups = groups.map((group) =>
      group.map((txn) => algosdk.encodeUnsignedSimulateTransaction(txn)),
    );
    const response = (await store.dispatch("algod/simulateTransactionGroups", {
      groups: encodedGroups,
    })) as algosdk.modelsv2.SimulateResponse;
    const summary = summarizeAppStateChanges(response, groups);
    rows.value = summary.rows;
    failureMessage.value = summary.failureMessage ?? "";
    status.value = "success";
    void ensureArc56Loaded(summary.rows.map((row) => row.appIndex));
  } catch (ex) {
    errorMessage.value = ex instanceof Error ? ex.message : String(ex);
    status.value = "error";
  }
};

watch(signature, () => void runSimulation(), { immediate: true });

defineExpose({ runSimulation });
</script>

<style scoped>
.sim-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid var(--p-primary-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
}

.sim-panel-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--p-primary-color);
}

.sim-panel-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}

.sim-panel-table {
  font-size: 0.85rem;
}

.sim-panel-contract-name,
.sim-panel-key-desc {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.sim-panel-empty {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.sim-panel-disclaimer {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}
</style>
