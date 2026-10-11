<template>
  <section
    class="app-card"
    :class="'app-card-' + summary.kind"
    data-testid="direct-app-card"
    :aria-label="title"
  >
    <header class="app-card-head">
      <span class="app-card-icon" aria-hidden="true">
        <i :class="icon" />
      </span>
      <div>
        <div class="app-card-title">{{ title }}</div>
        <div class="app-card-sub">
          {{ $t("connect.on_complete") }}: {{ summary.onComplete }}
        </div>
      </div>
    </header>

    <Message severity="warn" class="m-0" data-testid="direct-app-warning">
      {{ warning }}
    </Message>

    <Message
      v-if="summary.kind === 'create' && summary.onComplete !== 'NoOp'"
      severity="error"
      class="m-0"
      data-testid="direct-app-create-also"
    >
      {{ $t("connect.direct.app_create_also", { action: summary.onComplete }) }}
    </Message>

    <dl class="app-card-grid">
      <dt>{{ $t("connect.direct.app_id_label") }}</dt>
      <dd data-testid="direct-app-id">
        <template v-if="summary.kind === 'create'">
          {{ $t("connect.direct.app_id_new") }}
        </template>
        <template v-else>{{ summary.appIndex }}</template>
      </dd>

      <template v-if="summary.globalSchema">
        <dt>{{ $t("connect.direct.app_global_schema") }}</dt>
        <dd data-testid="direct-app-global-schema">
          {{ schemaText(summary.globalSchema) }}
        </dd>
      </template>
      <template v-if="summary.localSchema">
        <dt>{{ $t("connect.direct.app_local_schema") }}</dt>
        <dd data-testid="direct-app-local-schema">
          {{ schemaText(summary.localSchema) }}
        </dd>
      </template>
      <template v-if="summary.extraPages !== undefined && summary.kind === 'create'">
        <dt>{{ $t("connect.direct.app_extra_pages") }}</dt>
        <dd data-testid="direct-app-extra-pages">{{ summary.extraPages }}</dd>
      </template>
    </dl>

    <div
      v-for="program in programs"
      :key="program.key"
      class="app-program"
      :data-testid="'direct-app-' + program.key"
    >
      <div class="app-program-head">
        <strong>{{ program.label }}</strong>
        <span
          v-if="program.info"
          class="app-program-size"
          :data-testid="'direct-app-' + program.key + '-size'"
        >
          {{ $t("connect.direct.app_program_size", { size: program.info.size }) }}
        </span>
      </div>
      <div
        v-if="!program.info"
        class="app-program-none"
        :data-testid="'direct-app-' + program.key + '-none'"
      >
        {{ $t("connect.direct.app_program_none") }}
      </div>
      <div v-if="program.info" class="app-program-hash-row">
        <span class="app-program-hash-label">{{ $t("connect.direct.app_program_hash") }}</span>
        <code
          class="app-program-hash"
          :data-testid="'direct-app-' + program.key + '-hash'"
          >{{ program.info.sha256 }}</code
        >
        <Button
          :icon="copyState[program.key] === 'ok' ? 'pi pi-check' : copyState[program.key] === 'failed' ? 'pi pi-times' : 'pi pi-copy'"
          severity="secondary"
          text
          rounded
          size="small"
          :aria-label="$t('connect.direct.app_copy_hash')"
          @click="copy(program.key, program.info.sha256)"
        />
      </div>
      <div v-if="program.info" class="app-program-hash-row">
        <span class="app-program-hash-label">{{ $t("connect.direct.app_program_address") }}</span>
        <code
          class="app-program-hash"
          :data-testid="'direct-app-' + program.key + '-address'"
          >{{ program.info.address }}</code
        >
      </div>
      <Message
        v-if="program.info && deployed[program.key]"
        :severity="deployed[program.key] === 'different' ? 'warn' : deployed[program.key] === 'same' ? 'info' : 'secondary'"
        class="m-0"
        :data-testid="'direct-app-' + program.key + '-deployed'"
      >
        {{
          deployed[program.key] === "same"
            ? $t("connect.direct.app_deployed_same")
            : deployed[program.key] === "different"
              ? $t("connect.direct.app_deployed_different")
              : deployed[program.key] === "checking"
                ? $t("connect.direct.app_deployed_checking")
                : deployed[program.key] === "foreign"
                  ? $t("connect.direct.app_deployed_foreign")
                  : $t("connect.direct.app_deployed_unavailable")
        }}
      </Message>
      <button
        v-if="program.info"
        type="button"
        class="app-program-toggle"
        :data-testid="'direct-app-' + program.key + '-bytes-toggle'"
        :aria-expanded="open[program.key] === true"
        @click="open[program.key] = !open[program.key]"
      >
        <i :class="open[program.key] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" aria-hidden="true" />
        {{ open[program.key] ? $t("connect.direct.app_hide_bytes") : $t("connect.direct.app_show_bytes") }}
      </button>
      <div v-if="program.info && open[program.key]" class="app-program-bytes-wrap">
        <code class="app-program-bytes" :data-testid="'direct-app-' + program.key + '-bytes'">{{
          program.info.hex
        }}</code>
        <small v-if="program.info.truncated" class="text-color-secondary">
          {{
            $t("connect.direct.app_bytes_truncated", {
              shown: program.info.hex.length / 2,
              size: program.info.size,
            })
          }}
        </small>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "@/store";
import {
  compareWithDeployed,
  type ApplicationCallReview,
  type DeployedComparison,
  type ProgramInfo,
  type StateSchema,
} from "@/scripts/direct/appCall";

const props = defineProps<{
  summary: ApplicationCallReview;
  /** The request is for another network than the one the wallet's node serves: no lookup. */
  foreignNetwork?: boolean;
}>();
const { t } = useI18n();
const store = useStore();

// Explicit keys (not built by concatenation) so the locale-key spec can check every one.
const title = computed(() => {
  switch (props.summary.kind) {
    case "create":
      return t("connect.direct.app_kind_create");
    case "update":
      return t("connect.direct.app_kind_update");
    case "delete":
      return t("connect.direct.app_kind_delete");
    default:
      return "";
  }
});
const warning = computed(() => {
  switch (props.summary.kind) {
    case "create":
      return t("connect.direct.app_warning_create");
    case "update":
      return t("connect.direct.app_warning_update");
    case "delete":
      return t("connect.direct.app_warning_delete");
    default:
      return "";
  }
});
const icon = computed(() =>
  props.summary.kind === "create"
    ? "pi pi-plus-circle"
    : props.summary.kind === "update"
      ? "pi pi-refresh"
      : "pi pi-trash",
);

// A create and an update always list both programs; a missing/empty one says so instead of
// silently disappearing (the warning promises "the programs below").
const programs = computed(() => {
  const list: { key: string; label: string; info?: ProgramInfo }[] = [];
  if (props.summary.kind === "create" || props.summary.kind === "update") {
    list.push({
      key: "approval",
      label: t("connect.direct.app_approval_program"),
      info: props.summary.approval,
    });
    list.push({
      key: "clear",
      label: t("connect.direct.app_clear_program"),
      info: props.summary.clear,
    });
  }
  return list;
});

const open = reactive<Record<string, boolean>>({});
const copyState = reactive<Record<string, "ok" | "failed" | undefined>>({});
// For an update: does each program differ from the one deployed now? The deployed programs come
// from the user's own node (unauthenticated, AW-2026-010/011); a failed lookup says so rather
// than reading as "unchanged".
const deployed = reactive<Record<string, DeployedComparison | "checking" | "foreign" | undefined>>({});
// A card reused for another transaction starts with its bytes closed.
watch(
  () => props.summary,
  async (summary) => {
    open.approval = false;
    open.clear = false;
    copyState.approval = undefined;
    copyState.clear = undefined;
    deployed.approval = undefined;
    deployed.clear = undefined;
    if (summary.kind !== "update") return;
    if (props.foreignNetwork) {
      // The node serves the wallet's network: app ids there say nothing about this request's.
      deployed.approval = "foreign";
      deployed.clear = "foreign";
      return;
    }
    deployed.approval = "checking";
    deployed.clear = "checking";
    let programs: { approvalProgram?: Uint8Array; clearStateProgram?: Uint8Array } | undefined;
    try {
      programs = await store.dispatch("algod/getApplicationPrograms", {
        appIndex: BigInt(summary.appIndex),
      });
    } catch {
      programs = undefined;
    }
    if (props.summary !== summary) return; // the card moved on to another transaction
    deployed.approval = compareWithDeployed(summary.approval, programs?.approvalProgram);
    deployed.clear = compareWithDeployed(summary.clear, programs?.clearStateProgram);
  },
  { immediate: true },
);

const schemaText = (schema: StateSchema) =>
  `${t("connect.direct.app_ints", { n: schema.ints }, schema.ints)}, ${t(
    "connect.direct.app_slices",
    { n: schema.byteSlices },
    schema.byteSlices,
  )}`;

// The copy button shows a check (or a cross when the browser refuses): a silent failure would
// let the user paste a stale clipboard value into an explorer and compare the wrong hash.
const copyTimers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
const copy = async (key: string, value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    copyState[key] = "ok";
  } catch {
    copyState[key] = "failed";
  }
  clearTimeout(copyTimers[key]); // a second copy restarts the feedback
  copyTimers[key] = setTimeout(() => {
    copyState[key] = undefined;
  }, 2500);
};
onBeforeUnmount(() => Object.values(copyTimers).forEach((timer) => clearTimeout(timer)));
</script>

<style scoped>
.app-card {
  /* Never let the card (long hashes, the warning) widen the surrounding table. */
  contain: inline-size;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  margin: 0.25rem 0 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-left: 5px solid var(--p-orange-500);
  border-radius: var(--p-border-radius-md, 8px);
  background: var(--p-content-background);
}
.app-card-delete {
  border-left-color: var(--p-red-500);
}
/* The warning must wrap inside the card, never run past it. */
.app-card :deep(.p-message-content),
.app-card :deep(.p-message-text) {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}
.app-card-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.app-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: var(--p-orange-100, #ffedd5);
  color: var(--p-orange-700, #c2410c);
  font-size: 1.1rem;
}
.app-card-delete .app-card-icon {
  background: var(--p-red-100, #fee2e2);
  color: var(--p-red-700, #b91c1c);
}
.app-card-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}
.app-card-sub {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}
.app-card-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
}
.app-card-grid dt {
  color: var(--p-text-muted-color);
}
.app-card-grid dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.app-program {
  padding-top: 0.6rem;
  border-top: 1px solid var(--p-content-border-color);
}
.app-program-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
}
.app-program-size {
  color: var(--p-text-muted-color);
}
.app-program-hash-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
}
.app-program-hash-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}
.app-program-hash,
.app-program-bytes {
  min-width: 0;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}
.app-program-none {
  margin-top: 0.25rem;
  color: var(--p-text-muted-color);
  font-style: italic;
}
.app-program-toggle {
  margin-top: 0.25rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--p-primary-color);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}
.app-program-bytes-wrap {
  max-height: 11rem;
  margin-top: 0.4rem;
  padding: 0.5rem 0.6rem;
  overflow: auto;
  border-radius: var(--p-border-radius-sm, 6px);
  background: var(--p-surface-100, rgba(0, 0, 0, 0.05));
}
</style>
