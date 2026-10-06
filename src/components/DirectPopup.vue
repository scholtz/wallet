<template>
  <div class="direct-popup" data-testid="direct-popup">
    <header class="direct-header">
      <span class="direct-header-icon" aria-hidden="true">
        <i :class="headerIcon" />
      </span>
      <div>
        <div class="direct-kicker">{{ $t("connect.direct.tab") }}</div>
        <h1 class="direct-headline">{{ headline }}</h1>
      </div>
    </header>

    <Message
      v-if="status === 'framed'"
      severity="error"
      data-testid="direct-error-framed"
    >
      {{ $t("connect.direct.framed_error") }}
    </Message>
    <Message
      v-else-if="status === 'no_opener'"
      severity="error"
      data-testid="direct-error-no-opener"
    >
      {{ $t("connect.direct.no_opener_error") }}
    </Message>
    <Message
      v-else-if="status === 'bad_origin'"
      severity="error"
      data-testid="direct-error-bad-origin"
    >
      {{ $t("connect.direct.bad_origin_error") }}
    </Message>

    <template v-else>
      <section v-if="dappOrigin && originParts" class="direct-origin-card">
        <div class="direct-label">
          {{
            originConfirmed
              ? $t("connect.direct.origin_label")
              : $t("connect.direct.origin_label_claimed")
          }}
        </div>
        <div class="direct-origin" data-testid="direct-origin">
          <i
            class="direct-origin-icon"
            :class="originParts.secure ? 'pi pi-lock' : 'pi pi-desktop'"
            aria-hidden="true"
          /><span class="direct-origin-text"
            ><span class="direct-origin-scheme">{{ originParts.scheme }}</span
            ><strong>{{ originParts.host }}</strong></span
          >
        </div>
        <Message
          v-if="isDevelopmentOrigin(dappOrigin)"
          severity="warn"
          class="mt-2"
        >
          {{ $t("connect.direct.dev_origin") }}
        </Message>
      </section>

      <div v-if="status === 'waiting'" class="direct-state" data-testid="direct-waiting">
        <p>
          <i class="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
          {{ $t("connect.direct.waiting") }}
        </p>
        <small class="text-color-secondary">
          {{ $t("connect.direct.waiting_hint") }}
        </small>
      </div>

      <div v-else-if="status === 'refused'" class="direct-state" data-testid="direct-refused">
        <Message severity="error" class="my-2">
          {{ $t("connect.direct.refused") }}
        </Message>
        <Button @click="closeWindow">
          {{ $t("connect.direct.close_window") }}
        </Button>
      </div>

      <div v-else-if="status === 'expired'" class="direct-state" data-testid="direct-expired">
        <Message severity="warn" class="my-2">
          {{ $t("connect.direct.expired") }}
        </Message>
        <Button @click="closeWindow">
          {{ $t("connect.direct.close_window") }}
        </Button>
      </div>

      <div v-else-if="status === 'enable' && pendingEnable" class="direct-state">
        <div v-if="pendingEnable.peer.name" class="direct-peer">
          <strong>{{ pendingEnable.peer.name }}</strong>
          <small class="block text-color-secondary">
            {{ $t("connect.direct.peer_unverified") }}
          </small>
        </div>
        <div class="direct-row">
          <span class="direct-label">{{ $t("connect.direct.network") }}</span>
          <span data-testid="direct-network">{{ networkName }}</span>
        </div>

        <div class="direct-label mt-3">
          {{ $t("connect.direct.select_accounts") }}
        </div>
        <ul class="direct-accounts">
          <li
            v-for="account in eligibleAccounts"
            :key="account.addr"
            class="direct-account"
          >
            <Checkbox
              v-model="selected"
              :input-id="'direct-acc-' + account.addr"
              :value="account.addr"
              :data-testid="'direct-account-' + account.addr"
            />
            <label :for="'direct-acc-' + account.addr" class="direct-account-label">
              <span v-if="account.name" class="direct-account-name">{{
                account.name
              }}</span>
              <AlgorandAddress :address="account.addr" />
            </label>
          </li>
        </ul>
        <small class="block text-color-secondary mb-3">
          {{ $t("connect.direct.shared_note") }}
        </small>

        <Message severity="info" class="my-2">
          {{ $t("connect.direct.popup_help") }}
        </Message>
        <Message v-if="error" severity="error" class="my-2">{{ error }}</Message>

        <div class="direct-actions">
          <Button
            :disabled="selected.length === 0 || busy"
            :loading="busy"
            data-testid="direct-approve"
            @click="approve"
          >
            {{ $t("connect.direct.approve") }}
          </Button>
          <Button
            variant="outlined"
            severity="secondary"
            :disabled="busy"
            data-testid="direct-reject"
            @click="reject"
          >
            {{ $t("connect.direct.reject") }}
          </Button>
        </div>
      </div>

      <div v-else-if="status === 'signing'" class="direct-state">
        <small class="block text-color-secondary mb-2">
          {{ $t("connect.direct.sign_hint") }}
        </small>
        <ConnectRequestsTable
          v-if="requests.length > 0"
          :requests="requests"
          namespace="direct"
        />
        <ConnectSignDataRequestsTable
          v-else-if="signDataRequests.length > 0"
          :requests="signDataRequests"
          namespace="direct"
        />
      </div>

      <div v-else-if="status === 'done'" class="direct-state" data-testid="direct-done">
        <Message severity="success" class="my-2">
          {{ $t("connect.direct.done") }}
        </Message>
        <Button @click="closeWindow">
          {{ $t("connect.direct.close_window") }}
        </Button>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "@/store";
import { isDirectEligibleAccount } from "@/store/direct";
import { isDevelopmentOrigin } from "@/scripts/direct/protocol";
import ConnectRequestsTable from "@/components/ConnectRequestsTable.vue";
import ConnectSignDataRequestsTable from "@/components/ConnectSignDataRequestsTable.vue";
import AlgorandAddress from "@/components/AlgorandAddress.vue";

const store = useStore();
const { t } = useI18n();

const status = computed(() => store.state.direct.popup.status);
const dappOrigin = computed(() => store.state.direct.popup.dappOrigin);
const pendingEnable = computed(() => store.state.direct.pendingEnable);
const requests = computed(() => store.state.direct.requests);
const signDataRequests = computed(() => store.state.direct.signDataRequests);
const eligibleAccounts = computed(() =>
  store.state.wallet.privateAccounts.filter(isDirectEligibleAccount),
);
const networkName = computed(
  () => store.state.config.envName || store.state.config.env,
);

/** Scheme and host of the verified origin, shown separately so the host stands out. */
const originParts = computed(() => {
  if (!dappOrigin.value) return null;
  try {
    const url = new URL(dappOrigin.value);
    return {
      scheme: `${url.protocol}//`,
      host: url.host,
      secure: url.protocol === "https:",
    };
  } catch {
    return null;
  }
});

/** The origin is browser-verified only once a message from it has been accepted. */
const originConfirmed = computed(() =>
  ["enable", "signing", "done"].includes(status.value),
);

const headline = computed(() => {
  switch (status.value) {
    case "enable":
      return t("connect.direct.enable_title");
    case "signing":
      return t("connect.direct.signing_title");
    case "done":
      return t("connect.direct.done_title");
    case "waiting":
      return t("connect.direct.waiting_title");
    default:
      return t("connect.direct.problem_title");
  }
});

const headerIcon = computed(() => {
  switch (status.value) {
    case "enable":
      return "pi pi-link";
    case "signing":
      return "pi pi-pencil";
    case "done":
      return "pi pi-check-circle";
    case "waiting":
      return "pi pi-clock";
    default:
      return "pi pi-exclamation-triangle";
  }
});

// Least privilege: only the last active account is pre-selected.
const selected = ref<string[]>(
  eligibleAccounts.value.some(
    (a) => a.addr === store.state.wallet.lastActiveAccount,
  )
    ? [store.state.wallet.lastActiveAccount]
    : [],
);
const busy = ref(false);
const error = ref("");

onMounted(() => {
  // Coming back from /payWC (multisig) mounts this component again: never restart the channel.
  if (store.state.direct.popup.status === "idle") {
    void store.dispatch("direct/startPopup");
  }
  void store.dispatch("wallet/prolong");
});

const approve = async () => {
  busy.value = true;
  error.value = "";
  try {
    await store.dispatch("direct/approveEnable", { addresses: selected.value });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
};

const reject = () => {
  void store.dispatch("direct/rejectEnable");
};

const closeWindow = () => {
  window.close();
};
</script>

<style scoped>
.direct-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.direct-header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  font-size: 1.25rem;
  flex-shrink: 0;
}
.direct-kicker {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
}
.direct-headline {
  margin: 0;
  font-size: 1.4rem;
  line-height: 1.2;
}
.direct-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}
.direct-origin-card {
  border: 1px solid var(--p-content-border-color);
  border-left: 4px solid var(--p-primary-color);
  border-radius: var(--p-border-radius-md, 6px);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}
.direct-origin {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-family-body);
  font-size: 1.15rem;
  word-break: break-all;
}
.direct-origin-icon {
  flex-shrink: 0;
}
.direct-origin-scheme {
  color: var(--p-text-muted-color);
}
.direct-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--p-content-border-color);
}
.direct-row .direct-label {
  margin: 0;
}
.direct-accounts {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
}
.direct-account {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-content-border-color);
}
.direct-account-label {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  cursor: pointer;
}
.direct-account-name {
  font-weight: 600;
}
.direct-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.direct-actions > * {
  flex: 1 1 0;
}
.direct-peer {
  margin-bottom: 0.5rem;
}

/* Signing view: the shared request table, fitted to a narrow popup. */
.direct-popup :deep(.connect-requests-compact .p-datatable-thead),
.direct-popup :deep(.connect-requests-compact .p-datatable-column-header-content) {
  display: none;
}
.direct-popup :deep(.connect-requests-compact .p-datatable-table-container) {
  overflow-x: hidden;
}
.direct-popup :deep(.connect-requests-compact .p-datatable-table) {
  width: 100%;
}
.direct-popup :deep(.connect-requests-compact td) {
  overflow-wrap: anywhere;
  white-space: normal;
  padding: 0.5rem 0.4rem;
}
/* Detail list labels ("Genesis ID:") stay on one line; only values wrap. */
.direct-popup :deep(.connect-requests-compact .detail-scroll td:first-child) {
  white-space: nowrap;
  overflow-wrap: normal;
  padding-right: 0.75rem;
}
.direct-popup :deep(.connect-requests-compact .p-button) {
  white-space: nowrap;
}
.direct-popup :deep(.connect-requests-compact .p-datatable-row-expansion > td) {
  padding: 0.5rem 0;
}
.direct-popup :deep(.connect-requests-compact .detail-scroll) {
  padding: 0.5rem 0.25rem;
}
.direct-popup :deep(.connect-requests-compact .m-1) {
  margin: 0.15rem;
}
.direct-popup :deep(.connect-requests-compact .p-datatable-row-toggle-button) {
  display: none;
}
</style>
