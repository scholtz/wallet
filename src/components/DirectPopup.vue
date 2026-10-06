<template>
  <div class="direct-popup" data-testid="direct-popup">
    <h1>
      <span class="page-title-icon"
        ><i class="pi pi-external-link" aria-hidden="true"
      /></span>
      {{ $t("connect.direct.tab") }}
    </h1>

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
      <div v-if="dappOrigin" class="mb-3">
        <div class="font-bold">{{ $t("connect.direct.origin_label") }}</div>
        <div class="direct-origin" data-testid="direct-origin">
          {{ dappOrigin }}
        </div>
        <Message
          v-if="isDevelopmentOrigin(dappOrigin)"
          severity="warn"
          class="my-2"
        >
          {{ $t("connect.direct.dev_origin") }}
        </Message>
      </div>

      <div v-if="status === 'waiting'" data-testid="direct-waiting">
        <i class="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
        {{ $t("connect.direct.waiting") }}
      </div>

      <div v-else-if="status === 'refused'" data-testid="direct-refused">
        <Message severity="error" class="my-2">
          {{ $t("connect.direct.refused") }}
        </Message>
        <Button @click="closeWindow">
          {{ $t("connect.direct.close_window") }}
        </Button>
      </div>

      <div v-else-if="status === 'expired'" data-testid="direct-expired">
        <Message severity="warn" class="my-2">
          {{ $t("connect.direct.expired") }}
        </Message>
        <Button @click="closeWindow">
          {{ $t("connect.direct.close_window") }}
        </Button>
      </div>

      <div v-else-if="status === 'enable' && pendingEnable">
        <h2>{{ $t("connect.direct.enable_title") }}</h2>
        <div v-if="pendingEnable.peer.name" class="mb-2">
          <strong>{{ pendingEnable.peer.name }}</strong>
          <small class="block text-color-secondary">
            {{ $t("connect.direct.peer_unverified") }}
          </small>
        </div>
        <div class="mb-2">
          <strong>{{ $t("connect.direct.network") }}:</strong>
          {{ store.state.config.env }}
        </div>
        <h3>{{ $t("connect.direct.select_accounts") }}</h3>
        <div
          v-for="account in eligibleAccounts"
          :key="account.addr"
          class="flex align-items-center mb-2"
        >
          <Checkbox
            v-model="selected"
            :input-id="'direct-acc-' + account.addr"
            :value="account.addr"
            :data-testid="'direct-account-' + account.addr"
          />
          <label :for="'direct-acc-' + account.addr" class="ml-2">
            <span v-if="account.name" class="mr-2">{{ account.name }}</span>
            <AlgorandAddress :address="account.addr" />
          </label>
        </div>
        <Message severity="info" class="my-2">
          {{ $t("connect.direct.popup_help") }}
        </Message>
        <Message v-if="error" severity="error" class="my-2">{{ error }}</Message>
        <Button
          class="m-1"
          :disabled="selected.length === 0 || busy"
          data-testid="direct-approve"
          @click="approve"
        >
          {{ $t("connect.direct.approve") }}
        </Button>
        <Button
          class="m-1"
          variant="secondary"
          :disabled="busy"
          data-testid="direct-reject"
          @click="reject"
        >
          {{ $t("connect.direct.reject") }}
        </Button>
      </div>

      <div v-else-if="status === 'signing'">
        <h2>{{ $t("connect.direct.signing_title") }}</h2>
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

      <div v-else-if="status === 'done'" data-testid="direct-done">
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
import { useStore } from "@/store";
import { isDirectEligibleAccount } from "@/store/direct";
import { isDevelopmentOrigin } from "@/scripts/direct/protocol";
import ConnectRequestsTable from "@/components/ConnectRequestsTable.vue";
import ConnectSignDataRequestsTable from "@/components/ConnectSignDataRequestsTable.vue";
import AlgorandAddress from "@/components/AlgorandAddress.vue";

const store = useStore();

const status = computed(() => store.state.direct.popup.status);
const dappOrigin = computed(() => store.state.direct.popup.dappOrigin);
const pendingEnable = computed(() => store.state.direct.pendingEnable);
const requests = computed(() => store.state.direct.requests);
const signDataRequests = computed(() => store.state.direct.signDataRequests);
const eligibleAccounts = computed(() =>
  store.state.wallet.privateAccounts.filter(isDirectEligibleAccount),
);

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
.direct-origin {
  font-family: monospace;
  font-size: 1.15rem;
  word-break: break-all;
}
</style>
