<template>
  <MainLayout>
    <div>
      <h1>{{ $t("connect.title") }}</h1>

      <Card>
        <template #content>
          <TabView>
            <TabPanel value="0">
              <template #header>
                {{ $t("connect.wc1_tab") }}
                <Badge
                  v-if="wc1Requests.length > 0"
                  severity="danger"
                  class="ml-2"
                  :value="wc1Requests.length"
                />
              </template>
              <div v-if="!wc1Enabled">
                <Button @click="clickEnableWc1">
                  {{ $t("connect.enable_wc1") }}
                </Button>
              </div>
              <div v-else>
                <ConnectRequestsTable
                  v-if="wc1Requests.length > 0"
                  :requests="wc1Requests"
                  :account-address="accountAddress"
                />
                <h2>{{ $t("connect.uri") }}</h2>
                <InputText
                  id="uriWc1"
                  v-model="uriWc1"
                  class="w-full"
                  autocomplete="off"
                />
                <div v-if="scanWc1" class="col-12 m-2">
                  <QrcodeStream @decode="onDecodeQRWc1" />
                </div>
                <div>
                  <Button
                    class="m-1"
                    :disabled="!!uriWc1 && !connectableWc1"
                    @click="clickConnectWc1(uriWc1)"
                  >
                    {{ $t("connect.connect") }}
                  </Button>
                  {{ $t("connect.or") }}
                  <Button class="m-1" @click="clickPasteWc1">
                    {{ $t("connect.clipboard") }}
                  </Button>
                  {{ $t("connect.or") }}
                  <Button class="m-1" @click="scanWc1 = !scanWc1">
                    {{ $t("connect.toggle_camera") }}
                  </Button>
                </div>

                <div v-if="connectors && connectors.length > 0">
                  <h2>{{ $t("connect.sessions") }}</h2>
                  <DataTable
                    :value="connectors"
                    responsive-layout="scroll"
                    selection-mode="single"
                    :paginator="true"
                    :rows="20"
                  >
                    <Column
                      field="id"
                      :header="$t('connect.client_id')"
                      :sortable="true"
                    />
                    <Column
                      field="address"
                      :header="$t('connect.address')"
                      :sortable="true"
                    >
                      <template #body="slotProps">
                        <AlgorandAddress :address="slotProps.data.address" />
                      </template>
                    </Column>
                    <Column :header="$t('connect.peer')">
                      <template #body="slotProps">
                        <div v-if="slotProps.data.peer">
                          <img
                            v-if="
                              slotProps.data.peer.icons &&
                              slotProps.data.peer.icons.length
                            "
                            :src="slotProps.data.peer.icons[0]"
                            width="24"
                            height="24"
                          />
                          <a
                            target="_blank"
                            class="m-1"
                            :href="slotProps.data.peer.url"
                            :title="slotProps.data.peer.description"
                          >
                            {{ slotProps.data.peer.name }}
                          </a>
                        </div>
                      </template>
                    </Column>
                    <Column :header="$t('connect.connected')" :sortable="true">
                      <template #body="slotProps">
                        <input
                          class="form-check-input me-1"
                          type="checkbox"
                          :checked="slotProps.data.connected"
                          disabled
                        />
                        <Button
                          variant="secondary"
                          class="m-1"
                          @click="clickDisconnect(slotProps.data.id)"
                        >
                          {{ $t("connect.disconnect") }}
                        </Button>
                      </template>
                    </Column>
                  </DataTable>
                </div>
              </div>
            </TabPanel>
            <TabPanel value="1">
              <template #header>
                {{ $t("connect.wc2_tab") }}
                <Badge
                  v-if="wc2Requests.length > 0"
                  severity="danger"
                  class="ml-2"
                  :value="wc2Requests.length"
                />
              </template>
              <div v-if="!$store.state.wc.web3wallet">
                <Button @click="initConnection">
                  {{ $t("connect.init_wc") }}
                </Button>
              </div>
              <div v-else>
            <ConnectRequestsTable
              v-if="wc2Requests.length > 0"
              :requests="wc2Requests"
              :account-address="accountAddress"
            />
            <div v-else-if="sessionProposals && sessionProposals.length > 0">
              <h2 id="session_proposals">
                {{ $t("connect.session_proposals") }}
              </h2>
              <DataTable :value="sessionProposals" :paginator="true" :rows="20">
                <Column
                  field="id"
                  :header="$t('connect.request_id')"
                  :sortable="true"
                />
                <Column :header="$t('connect.proposer')">
                  <template #body="slotProps">
                    <div
                      v-if="
                        slotProps.data.params.proposer &&
                        slotProps.data.params.proposer.metadata
                      "
                    >
                      <img
                        v-if="
                          slotProps.data.params.proposer.metadata &&
                          slotProps.data.params.proposer.metadata.icons &&
                          slotProps.data.params.proposer.metadata.icons.length
                        "
                        :src="slotProps.data.params.proposer.metadata.icons[0]"
                        width="24"
                        height="24"
                      />

                      <a
                        target="_blank"
                        class="m-1"
                        :href="
                          normalizeUrl(
                            slotProps.data.params.proposer.metadata.url
                          )
                        "
                        :title="
                          slotProps.data.params.proposer.metadata.description
                        "
                        v-if="
                          slotProps.data.params.proposer &&
                          slotProps.data.params.proposer.metadata &&
                          slotProps.data.params.proposer.metadata.url
                        "
                      >
                        {{ slotProps.data.params.proposer.metadata.name }}
                      </a>
                      <div v-else>
                        {{ slotProps.data.params.proposer.metadata.name }}
                      </div>
                    </div>
                  </template>
                </Column>
                <Column :header="$t('connect.all_accounts')">
                  <template #body>
                    <Checkbox v-model="allAccounts" :binary="true"></Checkbox>
                  </template>
                </Column>
                <Column :header="$t('connect.connected')" :sortable="true">
                  <template #body="slotProps">
                    <Button
                      variant="seondary"
                      class="m-1"
                      @click="clickApproveSession(slotProps.data.id)"
                    >
                      {{ $t("connect.connect") }}
                    </Button>
                    <Button
                      variant="secondary"
                      class="m-1"
                      @click="clickRejectSession(slotProps.data.id)"
                    >
                      {{ $t("connect.reject") }}
                    </Button>
                  </template>
                </Column>
              </DataTable>
            </div>
            <div v-else>
              <h2>{{ $t("connect.uri") }}</h2>
              <InputText
                id="uri"
                v-model="uri"
                class="w-full"
                autocomplete="off"
              />
              <div v-if="scan" class="col-12 m-2">
                <QrcodeStream @decode="onDecodeQR" />
              </div>
              <div>
                <Button
                  class="m-1"
                  :disabled="!!uri && !connectable"
                  @click="clickConnect(uri)"
                >
                  {{ $t("connect.connect") }}
                </Button>
                {{ $t("connect.or") }}
                <Button class="m-1" @click="clickPaste">
                  {{ $t("connect.clipboard") }}
                </Button>
                {{ $t("connect.or") }}
                <Button class="m-1" @click="scan = !scan">
                  {{ $t("connect.toggle_camera") }}
                </Button>
              </div>
            </div>

            <div v-if="activeSessions && activeSessions.length > 0">
              <h2>{{ $t("connect.active_sessions") }}</h2>
              <DataTable
                :value="activeSessions"
                responsive-layout="scroll"
                selection-mode="single"
                :paginator="true"
                :rows="20"
              >
                <Column
                  field="topic"
                  :header="$t('connect.client_id')"
                  :sortable="true"
                />
                <Column :header="$t('connect.address')">
                  <template #body="slotProps">
                    <div
                      v-if="
                        sessionAddresses(slotProps.data.accounts).length > 1
                      "
                    >
                      {{ $t("connect.all_addresses") }}
                    </div>
                    <div
                      v-else-if="
                        sessionAddresses(slotProps.data.accounts).length === 1
                      "
                    >
                      <AlgorandAddress
                        :address="sessionAddresses(slotProps.data.accounts)[0]"
                      />
                    </div>
                  </template>
                </Column>
                <Column :header="$t('connect.peer')">
                  <template #body="slotProps">
                    <div v-if="slotProps.data.peer">
                      <img
                        v-if="
                          slotProps.data.peer.icons &&
                          slotProps.data.peer.icons.length
                        "
                        :src="slotProps.data.peer.icons[0]"
                        width="24"
                        height="24"
                      />
                      <a
                        target="_blank"
                        class="m-1"
                        :href="normalizeUrl(slotProps.data.peer.url)"
                        :title="slotProps.data.peer.description"
                      >
                        {{ slotProps.data.peer.name }}
                      </a>
                    </div>
                  </template>
                </Column>
                <Column>
                  <template #body="slotProps">
                    <Button
                      variant="secondary"
                      class="m-1"
                      @click="clickDisconnectSession(slotProps.data.topic)"
                    >
                      {{ $t("connect.disconnect") }}
                    </Button>
                  </template>
                </Column>
              </DataTable>
            </div>
            <Message severity="error" v-if="error" class="my-2">
              {{ error }}
            </Message>
              </div>
            </TabPanel>
          </TabView>
        </template>
      </Card>
    </div>
  </MainLayout>
</template>

<script lang="ts" setup>
import type algosdk from "algosdk";
import { QrcodeStream } from "qrcode-reader-vue3";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import MainLayout from "../layouts/Main.vue";
import AlgorandAddress from "../components/AlgorandAddress.vue";
import ConnectRequestsTable from "../components/ConnectRequestsTable.vue";
import wc from "../shared/wc";
import { useStore } from "../store";

interface TransactionWrapper {
  index: number;
  type: string;
  fee?: number;
  asset: string | number;
  amount?: number | string;
  rekeyTo?: string;
  txn: algosdk.Transaction;
  txnB64: string;
}

interface RequestItem {
  id: number | string;
  method: string;
  transactions: TransactionWrapper[];
  fee: number;
  ver: string;
  topic: string;
}

interface SessionProposal {
  id: number | string;
  params: {
    proposer: {
      metadata: {
        icons: string[];
        url: string;
        description: string;
        name: string;
      };
    };
  };
}

interface ConnectorItem {
  id: string;
  address: string;
  peer?: {
    icons: string[];
    url: string;
    description: string;
    name: string;
  };
  connected: boolean;
}

interface ActiveSessionItem {
  topic: string;
  peer?: {
    icons: string[];
    url: string;
    description: string;
    name: string;
  };
  accounts: string[];
}

const store = useStore();
const route = useRoute();
const $store = store;

const uri = ref("");
const uriWc1 = ref("");
const addr = ref("");
const error = ref<unknown>("");
const scan = ref(false);
const scanWc1 = ref(false);
const allAccounts = ref(true);

const requests = computed<RequestItem[]>(
  () => (store.state.wc.requests as RequestItem[] | undefined) ?? []
);
const wc1Requests = computed<RequestItem[]>(() =>
  requests.value.filter((request) => String(request.ver) !== "2")
);
const wc2Requests = computed<RequestItem[]>(() =>
  requests.value.filter((request) => String(request.ver) === "2")
);
const sessionProposals = computed<SessionProposal[]>(
  () => (store.state.wc.sessionProposals as SessionProposal[] | undefined) ?? []
);
const connectors = computed<ConnectorItem[]>(
  () =>
    (store.state.wc.connectors as unknown as ConnectorItem[] | undefined) ?? []
);
const activeSessions = computed<ActiveSessionItem[]>(
  () =>
    (store.state.wc.activeSessions as unknown as
      | ActiveSessionItem[]
      | undefined) ?? []
);
const wc1Enabled = computed(() => Boolean(store.state.wc.wc1Enabled));
const connectable = computed(() => Boolean(uri.value && uri.value.trim()));
const connectableWc1 = computed(() =>
  Boolean(uriWc1.value && uriWc1.value.trim())
);
const accountAddress = computed(() =>
  typeof route.params.account === "string" ? route.params.account : ""
);

const prolong = async () => {
  await store.dispatch("wallet/prolong");
};

const normalizeUrl = (url: string): string => {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return url;
  return `https://${url}`;
};

const sessionAddresses = (accounts: string[]): string[] => {
  const addresses = (accounts ?? []).map((account) => {
    const parts = account.split(":");
    return parts[parts.length - 1] ?? "";
  });
  return Array.from(new Set(addresses)).filter(Boolean);
};

const initConnection = () => {
  void store.dispatch("wc/init");
};

const reloadAccount = async () => {
  const currentAddr = accountAddress.value;
  if (!currentAddr) return;
  const info = await store.dispatch("indexer/accountInformation", {
    addr: currentAddr,
  });
  if (info) {
    await store.dispatch("wallet/updateAccount", { info });
  }
};

const clickDisconnect = async (id: string) => {
  await prolong();
  await wc.removeConnector(id);
  await store.dispatch("toast/openSuccess", {
    severity: "info",
    summary: "Session removed",
    life: 3000,
  });
};

const clickDisconnectSession = async (topic: string) => {
  await prolong();
  try {
    await store.dispatch("wc/disconnectSession", { topic });
    await store.dispatch("toast/openSuccess", {
      severity: "info",
      summary: "Session removed",
      life: 3000,
    });
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Disconnect session failed",
      detail: ex,
      life: 5000,
    });
  }
};

const clickEnableWc1 = async () => {
  try {
    await store.dispatch("wc/enableWc1");
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Enable WalletConnect v1 failed",
      detail: ex,
      life: 5000,
    });
  }
};

const clickConnectWc1 = async (value: string) => {
  await prolong();
  wc.createConnector(value, accountAddress.value);
  uriWc1.value = "";
  await store.dispatch("toast/openSuccess", {
    severity: "info",
    summary: "Session added",
    life: 3000,
  });
};

const clickPasteWc1 = async () => {
  await prolong();
  const clipboardUri = await navigator.clipboard.readText();
  try {
    await clickConnectWc1(clipboardUri);
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Connect from Clipboard",
      detail: ex,
      life: 5000,
    });
    throw ex;
  }
};

const clickPaste = async () => {
  await prolong();
  const clipboardUri = await navigator.clipboard.readText();
  try {
    await clickConnect(clipboardUri);
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Connect from Clipboard",
      detail: ex,
      life: 5000,
    });
    throw ex;
  }
};

const clickConnect = async (value: string) => {
  await prolong();
  await store.dispatch("wc/connectUri", { uri: value });
  await store.dispatch("toast/openSuccess", {
    severity: "info",
    summary: "Session added",
    life: 3000,
  });
};

const clickApproveSession = async (id: string) => {
  try {
    await store.dispatch("wc/approveSession", {
      id,
      allAccounts: allAccounts.value,
    });
  } catch (err: any) {
    const message = err?.message ?? err;
    await store.dispatch("toast/openError", message);
  }
};

const clickRejectSession = async (id: string) => {
  try {
    await store.dispatch("wc/rejectSession", { id });
  } catch (err: any) {
    const message = err?.message ?? err;
    await store.dispatch("toast/openError", message);
  }
};

const onDecodeQR = (result: string) => {
  if (result) {
    uri.value = result;
    scan.value = false;
  }
};

const onDecodeQRWc1 = (result: string) => {
  if (result) {
    uriWc1.value = result;
    scanWc1.value = false;
  }
};

watch(
  () => route.params.account,
  async (value) => {
    addr.value = typeof value === "string" ? value : "";
    await reloadAccount();
  }
);

onMounted(async () => {
  addr.value = accountAddress.value;
  await reloadAccount();
  await prolong();
});
</script>
