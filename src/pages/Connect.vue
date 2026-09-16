<template>
  <MainLayout>
    <div>
      <h1>
        <span class="page-title-icon"
          ><i class="pi pi-link" aria-hidden="true"
        /></span>
        {{ $t("connect.title") }}
      </h1>

      <Card>
        <template #content>
          <Tabs v-model:value="activeTab">
            <TabList>
              <Tab value="0">
                {{ $t("connect.wc1_tab") }}
                <Badge
                  v-if="wc1Requests.length > 0"
                  severity="danger"
                  class="ml-2"
                  :value="wc1Requests.length"
                />
              </Tab>
              <Tab value="1">
                {{ $t("connect.wc2_tab") }}
                <Badge
                  v-if="wc2Requests.length + signDataRequests.length > 0"
                  severity="danger"
                  class="ml-2"
                  :value="wc2Requests.length + signDataRequests.length"
                />
              </Tab>
              <Tab value="2">
                {{ $t("connect.liquid.tab") }}
                <Badge
                  v-if="
                    liquidRequests.length + liquidSignDataRequests.length > 0
                  "
                  severity="danger"
                  class="ml-2"
                  :value="liquidRequests.length + liquidSignDataRequests.length"
                />
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="0">
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
                              rel="noopener noreferrer"
                              class="m-1"
                              :href="normalizeUrl(slotProps.data.peer.url)"
                              :title="slotProps.data.peer.description"
                            >
                              {{ slotProps.data.peer.name }}
                            </a>
                          </div>
                        </template>
                      </Column>
                      <Column
                        :header="$t('connect.connected')"
                        :sortable="true"
                      >
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
                  <ConnectSignDataRequestsTable
                    v-else-if="signDataRequests.length > 0"
                    :requests="signDataRequests"
                  />
                  <div
                    v-else-if="sessionProposals && sessionProposals.length > 0"
                  >
                    <h2 id="session_proposals">
                      {{ $t("connect.session_proposals") }}
                    </h2>
                    <DataTable
                      :value="sessionProposals"
                      :paginator="true"
                      :rows="20"
                    >
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
                                slotProps.data.params.proposer.metadata.icons
                                  .length
                              "
                              :src="
                                slotProps.data.params.proposer.metadata.icons[0]
                              "
                              width="24"
                              height="24"
                            />

                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              class="m-1"
                              :href="
                                normalizeUrl(
                                  slotProps.data.params.proposer.metadata.url,
                                )
                              "
                              :title="
                                slotProps.data.params.proposer.metadata
                                  .description
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
                      <Column :header="$t('connect.verification')">
                        <template #body="slotProps">
                          <Badge
                            v-if="
                              verificationStatus(slotProps.data) === 'valid'
                            "
                            severity="success"
                            :value="$t('connect.domain_verified')"
                          />
                          <Message
                            v-else-if="
                              verificationStatus(slotProps.data) === 'scam'
                            "
                            severity="error"
                            class="m-0"
                          >
                            {{ $t("connect.domain_scam") }}
                          </Message>
                          <Message
                            v-else-if="
                              verificationStatus(slotProps.data) === 'invalid'
                            "
                            severity="error"
                            class="m-0"
                          >
                            {{ $t("connect.domain_mismatch") }}
                          </Message>
                          <Badge
                            v-else
                            severity="warn"
                            :value="$t('connect.domain_unknown')"
                          />
                        </template>
                      </Column>
                      <Column :header="$t('connect.all_accounts')">
                        <template #body>
                          <Checkbox
                            v-model="allAccounts"
                            :binary="true"
                          ></Checkbox>
                        </template>
                      </Column>
                      <Column
                        :header="$t('connect.connected')"
                        :sortable="true"
                      >
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
                              sessionAddresses(slotProps.data.accounts).length >
                              1
                            "
                          >
                            {{ $t("connect.all_addresses") }}
                          </div>
                          <div
                            v-else-if="
                              sessionAddresses(slotProps.data.accounts)
                                .length === 1
                            "
                          >
                            <AlgorandAddress
                              :address="
                                sessionAddresses(slotProps.data.accounts)[0]
                              "
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
                              rel="noopener noreferrer"
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
                            @click="
                              clickDisconnectSession(slotProps.data.topic)
                            "
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
              <TabPanel value="2">
                <div v-if="!$store.state.liquid.enabled">
                  <Button :disabled="liquidBusy" @click="clickReconnectLiquid">
                    {{ $t("connect.liquid.init_liquid") }}
                  </Button>
                </div>
                <div v-else>
                <p>{{ $t("connect.liquid.intro") }}</p>
                <div v-if="liquidNeedsReconnect" class="mb-3">
                  <Message severity="warn" class="my-2">
                    {{ $t("connect.liquid.reconnect_help") }}
                  </Message>
                  <Button :disabled="liquidBusy" @click="clickReconnectLiquid">
                    {{ $t("connect.liquid.init_liquid") }}
                  </Button>
                </div>
                <ConnectRequestsTable
                  v-if="liquidRequests.length > 0"
                  :requests="liquidRequests"
                  :account-address="accountAddress"
                  namespace="liquid"
                />
                <ConnectSignDataRequestsTable
                  v-else-if="liquidSignDataRequests.length > 0"
                  :requests="liquidSignDataRequests"
                  namespace="liquid"
                />
                <div v-else>
                  <h2>{{ $t("connect.liquid.account") }}</h2>
                  <Select
                    v-model="liquidAddress"
                    :options="liquidAccounts"
                    option-label="label"
                    option-value="addr"
                    class="w-full"
                  />
                  <Message
                    v-if="liquidAccounts.length === 0"
                    severity="warn"
                    class="my-2"
                  >
                    {{ $t("connect.liquid.unsupported_account") }}
                  </Message>
                  <h2>{{ $t("connect.liquid.uri") }}</h2>
                  <InputText
                    id="uriLiquid"
                    v-model="liquidUri"
                    class="w-full"
                    autocomplete="off"
                  />
                  <div v-if="scanLiquid" class="col-12 m-2">
                    <QrcodeStream @decode="onDecodeQRLiquid" />
                  </div>
                  <div>
                    <Button
                      class="m-1"
                      :disabled="!liquidConnectable || liquidBusy"
                      @click="clickConnectLiquid(liquidUri)"
                    >
                      {{ $t("connect.liquid.connect") }}
                    </Button>
                    {{ $t("connect.or") }}
                    <Button
                      class="m-1"
                      :disabled="liquidBusy"
                      @click="clickPasteLiquid"
                    >
                      {{ $t("connect.clipboard") }}
                    </Button>
                    {{ $t("connect.or") }}
                    <Button class="m-1" @click="scanLiquid = !scanLiquid">
                      {{ $t("connect.toggle_camera") }}
                    </Button>
                  </div>
                  <Message severity="info" class="my-2">
                    {{ $t("connect.liquid.passkey_help") }}
                  </Message>
                </div>

                <div v-if="liquidSessions.length > 0">
                  <h2>{{ $t("connect.liquid.sessions") }}</h2>
                  <DataTable
                    :value="liquidSessions"
                    responsive-layout="scroll"
                    :paginator="true"
                    :rows="20"
                  >
                    <Column
                      field="requestId"
                      :header="$t('connect.liquid.request_id')"
                      :sortable="true"
                    />
                    <Column
                      field="origin"
                      :header="$t('connect.liquid.origin')"
                      :sortable="true"
                    />
                    <Column :header="$t('connect.address')">
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
                            v-if="slotProps.data.peer.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="m-1"
                            :href="normalizeUrl(slotProps.data.peer.url)"
                            :title="slotProps.data.peer.description"
                          >
                            {{
                              slotProps.data.peer.name ||
                              slotProps.data.peer.url
                            }}
                          </a>
                          <span v-else>{{ slotProps.data.peer.name }}</span>
                        </div>
                        <span v-else>{{
                          $t("connect.liquid.peer_unknown")
                        }}</span>
                      </template>
                    </Column>
                    <Column :header="$t('connect.liquid.status')">
                      <template #body="slotProps">
                        <Badge
                          :severity="
                            liquidStatusSeverity(slotProps.data.status)
                          "
                          :value="liquidStatusLabel(slotProps.data.status)"
                        />
                      </template>
                    </Column>
                    <Column>
                      <template #body="slotProps">
                        <Button
                          variant="secondary"
                          class="m-1"
                          @click="
                            clickDisconnectLiquid(slotProps.data.requestId)
                          "
                        >
                          {{ $t("connect.disconnect") }}
                        </Button>
                      </template>
                    </Column>
                  </DataTable>
                </div>
                <Message severity="error" v-if="liquidError" class="my-2">
                  {{ liquidError }}
                </Message>
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </template>
      </Card>
    </div>
  </MainLayout>
</template>

<script lang="ts" setup>
import type { WalletKitTypes } from "@reown/walletkit";
import { QrcodeStream } from "qrcode-reader-vue3";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import Select from "primevue/select";
import MainLayout from "../layouts/Main.vue";
import AlgorandAddress from "../components/AlgorandAddress.vue";
import ConnectRequestsTable from "../components/ConnectRequestsTable.vue";
import ConnectSignDataRequestsTable from "../components/ConnectSignDataRequestsTable.vue";
import wc from "../shared/wc";
import { useStore } from "../store";
import type {
  ActiveSessionRecord,
  ConnectorRecord,
  StoredRequest,
  StoredSignDataRequest,
} from "../store/wc";
import type { LiquidSessionRecord } from "../store/liquid";
import type { LiquidRuntimeStatus } from "../shared/liquid";

type RequestItem = StoredRequest;

/** WalletConnect v2 domain-verification signal (audit finding AW-2026-008). */
type SessionProposal = WalletKitTypes.EventArguments["session_proposal"];

type ConnectorItem = ConnectorRecord;

type ActiveSessionItem = ActiveSessionRecord;

const store = useStore();
const route = useRoute();
const { t } = useI18n();
const $store = store;

const activeTab = ref("0");
const uri = ref("");
const uriWc1 = ref("");
const addr = ref("");
// Never reassigned elsewhere in this file - kept as a plain string ref
// rather than `unknown` since its only value is this static initializer.
const error = ref<string>("");
const scan = ref(false);
const scanWc1 = ref(false);
// Default to exposing only the active account to a connecting DApp; the
// user must opt in to sharing every account (audit finding AW-2026-009).
const allAccounts = ref(false);

const requests = computed<RequestItem[]>(() => store.state.wc.requests);
const wc1Requests = computed<RequestItem[]>(() =>
  requests.value.filter((request) => String(request.ver) !== "2"),
);
const wc2Requests = computed<RequestItem[]>(() =>
  requests.value.filter((request) => String(request.ver) === "2"),
);
const signDataRequests = computed<StoredSignDataRequest[]>(
  () => store.state.wc.signDataRequests,
);
const sessionProposals = computed<SessionProposal[]>(
  () => store.state.wc.sessionProposals,
);
const connectors = computed<ConnectorItem[]>(() => store.state.wc.connectors);
const activeSessions = computed<ActiveSessionItem[]>(
  () => store.state.wc.activeSessions,
);
const wc1Enabled = computed(() => Boolean(store.state.wc.wc1Enabled));

// ---------- Liquid Auth tab ----------
const liquidUri = ref("");
const scanLiquid = ref(false);
const liquidBusy = ref(false);
const liquidError = ref("");
const liquidAddress = ref(
  (typeof route.params.account === "string" && route.params.account) ||
    store.state.wallet.lastActiveAccount,
);
// Only accounts whose signing key lives in this wallet can sign the Liquid
// Auth passkey challenge (see signer/signLiquidChallenge).
const liquidAccounts = computed(() =>
  store.state.wallet.privateAccounts
    .filter(
      (account) =>
        !account.isHidden &&
        !account.params &&
        (account.type === "hd" || Boolean(account.sk)),
    )
    .map((account) => ({
      addr: account.addr,
      label: `${account.name ?? ""} (${account.addr.slice(0, 6)}...${account.addr.slice(-4)})`,
    })),
);
const liquidSessions = computed<LiquidSessionRecord[]>(
  () => store.state.liquid.sessions,
);
const liquidRequests = computed<RequestItem[]>(
  () => store.state.liquid.requests,
);
const liquidSignDataRequests = computed<StoredSignDataRequest[]>(
  () => store.state.liquid.signDataRequests,
);
const liquidConnectable = computed(
  () =>
    liquidUri.value.trim().toLowerCase().startsWith("liquid://") &&
    Boolean(liquidAddress.value),
);
const liquidNeedsReconnect = computed(() =>
  liquidSessions.value.some(
    (session) =>
      session.status === "disconnected" || session.status === "closed",
  ),
);
const connectable = computed(() => Boolean(uri.value && uri.value.trim()));
const connectableWc1 = computed(() =>
  Boolean(uriWc1.value && uriWc1.value.trim()),
);
const accountAddress = computed(() =>
  typeof route.params.account === "string" ? route.params.account : "",
);

const prolong = async () => {
  await store.dispatch("wallet/prolong");
};

const normalizeUrl = (url: string): string => {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return url;
  return `https://${url}`;
};

type VerificationStatus = "valid" | "invalid" | "scam" | "unknown";

const verificationStatus = (proposal: SessionProposal): VerificationStatus => {
  const verified = proposal.verifyContext?.verified;
  if (verified?.isScam) return "scam";
  if (verified?.validation === "VALID") return "valid";
  if (verified?.validation === "INVALID") return "invalid";
  return "unknown";
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.dispatch("toast/openError", message);
  }
};

const clickRejectSession = async (id: string) => {
  try {
    await store.dispatch("wc/rejectSession", { id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
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

const liquidStatusLabel = (status: LiquidRuntimeStatus): string => {
  switch (status) {
    case "connected":
      return t("connect.liquid.status_connected");
    case "connecting":
      return t("connect.liquid.status_connecting");
    case "closed":
      return t("connect.liquid.status_closed");
    default:
      return t("connect.liquid.status_disconnected");
  }
};

const liquidStatusSeverity = (status: LiquidRuntimeStatus): string => {
  if (status === "connected") return "success";
  if (status === "connecting") return "info";
  return "warn";
};

const clickConnectLiquid = async (value: string) => {
  await prolong();
  liquidError.value = "";
  if (!value.trim().toLowerCase().startsWith("liquid://")) {
    liquidError.value = t("connect.liquid.invalid_link");
    return;
  }
  liquidBusy.value = true;
  try {
    await store.dispatch("liquid/connect", {
      uri: value.trim(),
      address: liquidAddress.value,
    });
    liquidUri.value = "";
    await store.dispatch("toast/openSuccess", {
      severity: "info",
      summary: t("connect.liquid.session_added"),
      life: 3000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    liquidError.value = message;
    await store.dispatch("toast/openError", message);
  } finally {
    liquidBusy.value = false;
  }
};

const clickPasteLiquid = async () => {
  await prolong();
  const clipboardUri = await navigator.clipboard.readText();
  liquidUri.value = clipboardUri;
  await clickConnectLiquid(clipboardUri);
};

const onDecodeQRLiquid = (result: string) => {
  if (result) {
    liquidUri.value = result;
    scanLiquid.value = false;
  }
};

const clickDisconnectLiquid = async (requestId: string) => {
  await prolong();
  await store.dispatch("liquid/disconnect", { requestId });
  await store.dispatch("toast/openSuccess", {
    severity: "info",
    summary: t("connect.liquid.session_removed"),
    life: 3000,
  });
};

const clickReconnectLiquid = async () => {
  await prolong();
  liquidError.value = "";
  liquidBusy.value = true;
  try {
    await store.dispatch(
      store.state.liquid.enabled ? "liquid/reconnect" : "liquid/init",
    );
    await store.dispatch("toast/openSuccess", {
      severity: "info",
      summary: t("connect.liquid.session_added"),
      life: 3000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    liquidError.value = message;
    await store.dispatch("toast/openError", message);
  } finally {
    liquidBusy.value = false;
  }
};

watch(
  () => route.params.account,
  async (value) => {
    addr.value = typeof value === "string" ? value : "";
    await reloadAccount();
  },
);

onMounted(async () => {
  addr.value = accountAddress.value;
  await reloadAccount();
  await prolong();
});
</script>
