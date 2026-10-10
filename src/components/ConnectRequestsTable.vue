<template>
  <div v-if="requests.length > 0" :class="{ 'connect-requests-compact': compact }">
    <h2 v-if="!compact" id="requests">
      {{ $t("connect.requests") }}
    </h2>
    <DataTable
      v-model:expandedRows="expandedRequests"
      v-model:selection="selectedRequest"
      :value="requests"
      responsive-layout="scroll"
      selection-mode="single"
      :paginator="!compact"
      :rows="20"
    >
      <Column expander style="width: 5rem" />
      <Column
        v-if="!compact"
        field="id"
        :header="$t('connect.request_id')"
        :sortable="true"
      />
      <Column
        v-if="!compact"
        field="method"
        :header="$t('connect.method')"
        :sortable="true"
      />
      <Column v-if="compact" class="direct-summary-column">
        <template #body="slotProps">
          <div class="direct-tx-summary" data-testid="direct-tx-summary">
            <div class="direct-tx-count text-color-secondary">
              {{
                $t("connect.direct.tx_count", {
                  count: slotProps.data.transactions?.length ?? 0,
                })
              }}
            </div>
            <ul class="direct-tx-lines">
              <li
                v-for="tx in slotProps.data.transactions"
                :key="tx.index"
                data-testid="direct-tx-line"
              >
                <AlgorandAddress
                  v-if="encodeAddress(tx.txn.sender) !== '-'"
                  :address="encodeAddress(tx.txn.sender)"
                  data-testid="direct-tx-from"
                />
                <i class="pi pi-arrow-right direct-tx-arrow" aria-hidden="true" />
                <strong>{{ txTypeLabel(tx) }}</strong>
                <span v-if="txSummaryAmount(tx)" class="direct-tx-amount">
                  {{ txSummaryAmount(tx) }}
                </span>
                <template v-if="txSummaryTo(tx)">
                  <i class="pi pi-arrow-right direct-tx-arrow" aria-hidden="true" />
                  <AlgorandAddress :address="txSummaryTo(tx)" />
                </template>
                <span v-if="tx.txn.rekeyTo" class="direct-tx-flag" data-testid="direct-tx-rekey">
                  <Badge severity="danger" :value="$t('connect.rekeyto')" />
                  <AlgorandAddress :address="encodeAddress(tx.txn.rekeyTo)" />
                </span>
                <span v-if="getCloseTo(tx.txn)" class="direct-tx-flag" data-testid="direct-tx-close">
                  <Badge severity="danger" :value="$t('connect.close_to')" />
                  <AlgorandAddress :address="getCloseTo(tx.txn)" />
                </span>
                <span v-if="clawbackFrom(tx.txn)" class="direct-tx-flag">
                  <Badge
                    severity="danger"
                    :value="$t('connect.clawback_from')"
                    data-testid="direct-tx-clawback"
                  />
                  <AlgorandAddress :address="clawbackFrom(tx.txn)" />
                </span>
                <Badge
                  v-if="onCompleteIsDestructive(tx.txn)"
                  severity="danger"
                  :value="onCompleteLabel(tx.txn)"
                  data-testid="direct-tx-destructive"
                />
              </li>
            </ul>
            <Message
              v-if="hasPartialMultisig(slotProps.data)"
              severity="warn"
              class="m-0 mt-2"
              data-testid="direct-partial-msig"
            >
              {{ $t("connect.direct.partial_msig_note") }}
            </Message>
            <Message
              v-if="lowFalconFee(slotProps.data) !== undefined"
              severity="warn"
              class="m-0 mt-2"
              data-testid="direct-falcon-fee"
            >
              {{
                $t("connect.direct.falcon_fee_warning", {
                  fee: formatNative(lowFalconFee(slotProps.data)),
                })
              }}
            </Message>
          </div>
        </template>
      </Column>
      <Column :header="$t('connect.total_fee')">
        <template #body="slotProps">
          <span v-if="compact" class="text-color-secondary"
            >{{ $t("connect.total_fee") }}: </span
          >{{ formatNative(slotProps.data.fee) }}
        </template>
      </Column>
      <Column>
        <template #body="slotProps">
          <Button
            class="m-1"
            v-if="needsSigning(slotProps.data)"
            @click="clickSignAll(slotProps.data)"
          >
            {{ signAllLabel(slotProps.data) }}
          </Button>
          <Arc56RiskIcon
            v-if="!foreignNetwork && !atLeastOneSigned(slotProps.data)"
            :transactions="slotProps.data.transactions"
          />
          <Button
            v-if="!compact || atLeastOneSigned(slotProps.data)"
            class="m-1"
            :disabled="
              !store.state.wallet.isOpen ||
              !atLeastOneSigned(slotProps.data) ||
              (compact && hasUnsignedTransaction(slotProps.data))
            "
            @click="clickAccept(slotProps.data)"
          >
            {{ $t("connect.sendBack") }}
          </Button>
          <Button
            v-if="!compact"
            class="m-1"
            @click="clickCopyPayload(slotProps.data)"
          >
            <i class="pi pi-copy"></i>
          </Button>
          <span v-if="!compact && !atLeastOneSigned(slotProps.data)" class="m-2">
            {{ $t("connect.sign_txs") }}
          </span>
          <Button
            class="m-1"
            :disabled="!store.state.wallet.isOpen"
            @click="clickReject(slotProps.data)"
          >
            {{ $t("connect.reject") }}
          </Button>
        </template>
      </Column>
      <template #expansion="requestSlotProps">
        <div class="p-3">
          <Message
            v-if="foreignNetwork"
            severity="secondary"
            class="m-0 mb-2"
            data-testid="direct-foreign-note"
          >
            {{ $t("connect.direct.network_foreign_note") }}
          </Message>
          <Message
            v-if="!compact && lowFalconFee(requestSlotProps.data) !== undefined"
            severity="warn"
            class="m-0 mb-2"
            data-testid="falcon-fee-warning"
          >
            {{
              $t("connect.direct.falcon_fee_warning", {
                fee: formatNative(lowFalconFee(requestSlotProps.data)),
              })
            }}
          </Message>
          <Arc56RequestSummary
            v-if="!foreignNetwork"
            :transactions="requestSlotProps.data.transactions"
          />
          <DataTable
            v-model:expandedRows="expandedTransactions"
            v-model:selection="selectedTransaction"
            :value="requestSlotProps.data.transactions"
            selection-mode="single"
          >
            <Column expander style="width: 5rem" />
            <Column>
              <template #body="slotProps">
                <Button
                  v-if="toBeSigned(slotProps.data)"
                  class="m-1"
                  :disabled="!store.state.wallet.isOpen"
                  @click="clickSign(slotProps.data, requestSlotProps.data)"
                >
                  {{
                    isArc14Auth(slotProps.data.txn)
                      ? arc14AuthenticateLabel(slotProps.data.txn)
                      : $t("connect.sign")
                  }}
                </Button>
                <Badge
                  severity="success"
                  v-else
                  class="badge bg-success"
                  :value="$t('connect.signed')"
                />
              </template>
            </Column>
            <Column
              v-if="!compact"
              field="index"
              :header="$t('connect.index')"
              :sortable="true"
            />
            <Column
              field="type"
              :header="$t('connect.type')"
              :sortable="true"
            >
              <template #body="slotProps">
                {{
                  isAssetOptIn(slotProps.data.txn)
                    ? $t("pay.asset_optin")
                    : slotProps.data.type
                }}
                <Badge
                  v-if="isArc14Auth(slotProps.data.txn)"
                  severity="info"
                  :value="$t('connect.arc14_auth_badge')"
                />
              </template>
            </Column>
            <Column
              v-if="!compact"
              field="sender"
              :header="$t('connect.from')"
              :sortable="true"
            >
              <template #body="slotProps">
                <AlgorandAddress
                  :address="encodeAddress(slotProps.data.txn.sender)"
                />
              </template>
            </Column>
            <Column
              v-if="!compact"
              field="asset"
              :header="$t('connect.asset')"
              :sortable="true"
            />
            <Column
              v-if="!compact"
              field="amount"
              :header="$t('connect.amount')"
              :sortable="true"
            >
              <template #body="slotProps">
                <div v-if="slotProps.data.txn">
                  <div v-if="slotProps.data.txn.type == 'pay'" class="text-end">
                    {{ formatNative(slotProps.data.txn.payment?.amount) }}
                  </div>
                  <div
                    v-else-if="slotProps.data.txn.type == 'axfer'"
                    class="text-end"
                  >
                    {{
                      formatAssetAmount(
                        slotProps.data.txn.assetTransfer?.amount,
                        slotProps.data.txn.assetTransfer?.assetIndex
                      )
                    }}
                  </div>
                </div>
              </template>
            </Column>
            <Column
              v-if="!compact"
              field="fee"
              :header="$t('connect.fee')"
              :sortable="true"
            >
              <template #body="slotProps">
                {{ formatNative(slotProps.data["fee"]) }}
              </template>
            </Column>
            <Column :header="$t('connect.rekeyto')" :sortable="true">
              <template #body="slotProps">
                <Message
                  v-if="slotProps.data.txn.rekeyTo"
                  severity="error"
                  class="m-0"
                >
                  <AlgorandAddress
                    :address="encodeAddress(slotProps.data.txn.rekeyTo)"
                  />
                </Message>
              </template>
            </Column>
            <Column :header="$t('connect.close_to')">
              <template #body="slotProps">
                <Message
                  v-if="getCloseTo(slotProps.data.txn)"
                  severity="error"
                  class="m-0"
                >
                  <AlgorandAddress :address="getCloseTo(slotProps.data.txn)" />
                </Message>
              </template>
            </Column>
            <template #expansion="txProps">
              <div class="p-3 detail-scroll">
                <table>
                  <tbody>
                    <tr v-if="isArc14Auth(txProps.data.txn)">
                      <td colspan="2">
                        <Message severity="info" class="m-0">
                          {{
                            $t("connect.arc14_auth_notice", {
                              realm: arc14Realm(txProps.data.txn),
                            })
                          }}
                        </Message>
                      </td>
                    </tr>
                    <tr v-if="txProps.data.txn.sender">
                      <td>{{ $t("connect.from") }}:</td>
                      <td>
                        <AlgorandAddress
                          :address="encodeAddress(txProps.data.txn.sender)"
                        />
                      </td>
                    </tr>
                    <tr
                      v-if="
                        txProps.data.txn.payment?.receiver ||
                        txProps.data.txn.assetTransfer?.receiver
                      "
                    >
                      <td>{{ $t("connect.to") }}:</td>
                      <td>
                        <AlgorandAddress
                          :address="
                            encodeAddress(
                              txProps.data.txn.payment?.receiver ||
                                txProps.data.txn.assetTransfer?.receiver
                            )
                          "
                        />
                      </td>
                    </tr>
                    <tr v-if="compact">
                      <td>{{ $t("connect.fee") }}:</td>
                      <td>{{ formatNative(Number(txProps.data.txn.fee)) }}</td>
                    </tr>
                    <tr v-if="txProps.data.txn.type == 'axfer'">
                      <td>{{ $t("connect.asset") }}:</td>
                      <td>
                        {{ txProps.data.txn.assetTransfer?.assetIndex }}
                        <span v-if="getAssetName(txProps.data.txn.assetTransfer?.assetIndex)">
                          ({{ getAssetName(txProps.data.txn.assetTransfer?.assetIndex) }})
                        </span>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        txProps.data.txn.type == 'pay' ||
                        txProps.data.txn.type == 'axfer'
                      "
                    >
                      <td>{{ $t("connect.amount") }}:</td>
                      <td>
                        <div v-if="txProps.data.txn.type == 'pay'">
                          {{ formatNative(txProps.data.txn.payment?.amount) }}
                        </div>
                        <div v-else>
                          {{
                            formatAssetAmount(
                              txProps.data.txn.assetTransfer?.amount,
                              txProps.data.txn.assetTransfer?.assetIndex
                            )
                          }}
                        </div>
                      </td>
                    </tr>
                    <tr v-if="txProps.data.txn.rekeyTo">
                      <td>{{ $t("connect.rekeyto") }}:</td>
                      <td>
                        <Message severity="error" class="m-0">
                          <AlgorandAddress
                            :address="encodeAddress(txProps.data.txn.rekeyTo)"
                          />
                          <div>{{ $t("pay.rekey_warning") }}</div>
                        </Message>
                      </td>
                    </tr>
                    <tr v-if="getCloseTo(txProps.data.txn)">
                      <td>{{ $t("connect.close_to") }}:</td>
                      <td>
                        <Message severity="error" class="m-0">
                          <AlgorandAddress
                            :address="getCloseTo(txProps.data.txn)"
                          />
                          <div>
                            {{
                              txProps.data.txn.assetTransfer?.closeRemainderTo
                                ? $t("pay.asset_close_to_warning")
                                : $t("pay.close_to_warning")
                            }}
                          </div>
                        </Message>
                      </td>
                    </tr>
                    <tr>
                      <td>{{ $t("connect.validity") }}:</td>
                      <td>
                        {{ txProps.data.txn.firstValid }} -
                        {{ txProps.data.txn.lastValid }} ({{
                          BigInt(txProps.data.txn.lastValid) -
                          BigInt(txProps.data.txn.firstValid) +
                          BigInt(1)
                        }}
                        {{ $t("connect.rounds") }})
                      </td>
                    </tr>
                    <tr>
                      <td>{{ $t("connect.type") }}:</td>
                      <td>
                        {{
                          isAssetOptIn(txProps.data.txn)
                            ? $t("pay.asset_optin")
                            : txProps.data.type
                        }}
                      </td>
                    </tr>
                    <tr>
                      <td>{{ $t("connect.note") }}:</td>
                      <td>
                        <table>
                          <tbody>
                            <tr>
                              <td>
                                {{
                                  isArc14Auth(txProps.data.txn)
                                    ? arc14Realm(txProps.data.txn)
                                    : formatData(txProps.data.txn.note, "Text")
                                }}
                              </td>
                              <td>
                                {{ formatData(txProps.data.txn.note, "UInt") }}
                              </td>
                              <td>
                                {{ formatData(txProps.data.txn.note, "Hex") }}
                              </td>
                              <td>
                                {{ formatData(txProps.data.txn.note, "B64") }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    <tr v-if="txProps.data.txn.group">
                      <td>{{ $t("connect.group") }}:</td>
                      <td>
                        {{ formatGroup(txProps.data.txn.group) }}
                      </td>
                    </tr>

                    <tr
                      v-if="
                        txProps.data.type == 'appl' &&
                        onCompleteLabel(txProps.data.txn)
                      "
                    >
                      <td>{{ $t("connect.on_complete") }}:</td>
                      <td>
                        <Message
                          v-if="onCompleteIsDestructive(txProps.data.txn)"
                          severity="warn"
                          class="m-0"
                          >{{ onCompleteLabel(txProps.data.txn) }}</Message
                        >
                        <span v-else>{{ onCompleteLabel(txProps.data.txn) }}</span>
                      </td>
                    </tr>
                    <tr v-if="clawbackFrom(txProps.data.txn)">
                      <td>{{ $t("connect.clawback_from") }}:</td>
                      <td>
                        <Message severity="error" class="m-0">
                          <AlgorandAddress
                            :address="clawbackFrom(txProps.data.txn)"
                          />
                          {{ $t("connect.clawback_warning") }}
                        </Message>
                      </td>
                    </tr>
                    <tr v-if="txProps.data.type == 'appl'">
                      <td>{{ $t("connect.app") }}:</td>
                      <td>
                        {{ txProps.data.txn.applicationCall?.appIndex }}
                      </td>
                    </tr>

                    <tr v-if="txProps.data.type == 'appl' && !foreignNetwork">
                      <td colspan="2">
                        <Arc56CallDetails
                          :app-index="
                            BigInt(
                              txProps.data.txn.applicationCall?.appIndex ?? 0
                            )
                          "
                          :txn="txProps.data.txn"
                          :current-index="txProps.data.index"
                          :group-transactions="requestSlotProps.data.transactions"
                        />
                      </td>
                    </tr>

                    <tr
                      v-if="
                        txProps.data.type == 'appl' &&
                        txProps.data.txn.applicationCall?.appArgs
                      "
                    >
                      <td>{{ $t("connect.app_args") }}:</td>
                      <td>
                        <table>
                          <tbody>
                            <tr
                              v-for="(arg, index) in txProps.data.txn
                                .applicationCall.appArgs"
                              :key="arg"
                            >
                              <td>{{ Number(index) + 1 }}.</td>
                              <td>{{ formatData(arg, "Text") }}</td>
                              <td>{{ formatData(arg, "UInt") }}</td>
                              <td>{{ formatData(arg, "Hex") }}</td>
                              <td>{{ formatData(arg, "B64") }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        txProps.data.type == 'appl' &&
                        txProps.data.txn.applicationCall?.accounts
                      "
                    >
                      <td>{{ $t("connect.app_accounts") }}:</td>
                      <td>
                        <ol>
                          <li
                            v-for="acc in txProps.data.txn.applicationCall
                              .accounts"
                            :key="acc"
                          >
                            {{ formatAppAccount(acc) }}
                          </li>
                        </ol>
                      </td>
                    </tr>

                    <tr
                      v-if="
                        txProps.data.type == 'appl' &&
                        txProps.data.txn.applicationCall?.foreignAssets
                      "
                    >
                      <td>{{ $t("connect.app_assets") }}:</td>
                      <td>
                        <ol>
                          <li
                            v-for="asset in txProps.data.txn.applicationCall
                              .foreignAssets"
                            :key="asset"
                          >
                            {{ asset }}
                          </li>
                        </ol>
                      </td>
                    </tr>
                    <tr
                      v-if="
                        txProps.data.type == 'appl' &&
                        txProps.data.txn.applicationCall?.boxes
                      "
                    >
                      <td>{{ $t("connect.boxes") }}:</td>
                      <td>
                        <ol>
                          <li
                            v-for="(box, index) in txProps.data.txn
                              .applicationCall.boxes"
                            :key="index"
                          >
                            {{ $t("connect.app") }}:
                            {{ box.appIndex }},
                            {{ $t("connect.name") }}:
                            {{ formatData(box.name, "B64") }}
                          </li>
                        </ol>
                      </td>
                    </tr>
                    <tr>
                      <td>{{ $t("connect.genesis") }}:</td>
                      <td>
                        {{ txProps.data.txn.genesisID }}
                        <Message
                          v-if="genesisMismatch(txProps.data.txn)"
                          severity="error"
                          class="m-0"
                        >
                          {{ $t("connect.genesis_mismatch") }}
                        </Message>
                        <Message
                          v-else-if="genesisIdDiffers(txProps.data.txn)"
                          severity="warn"
                          class="m-0"
                          data-testid="genesis-id-differs"
                        >
                          {{ $t("connect.genesis_id_differs") }}
                        </Message>
                        <Message
                          v-else-if="genesisUnverified(txProps.data.txn)"
                          severity="warn"
                          class="m-0"
                          data-testid="genesis-unverified"
                        >
                          {{ $t("connect.genesis_unverified") }}
                        </Message>
                      </td>
                    </tr>
                    <tr>
                      <td>{{ $t("connect.genesis_hash") }}:</td>
                      <td>
                        {{ formatGenesisHash(txProps.data.txn.genesisHash) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </DataTable>
          <TransactionGroupSimulation
            v-if="
              !foreignNetwork &&
              simulatableTransactions(requestSlotProps.data).length > 0
            "
            :transactions="simulatableTransactions(requestSlotProps.data)"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script lang="ts" setup>
import { Buffer } from "buffer";
import { payWcPath } from "@/scripts/wcNavigation";
import algosdk from "algosdk";
import {
  computed,
  getCurrentInstance,
  onMounted,
  ref,
  type ComponentPublicInstance,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import AlgorandAddress from "./AlgorandAddress.vue";
import Arc56CallDetails from "./Arc56CallDetails.vue";
import Arc56RequestSummary from "./Arc56RequestSummary.vue";
import Arc56RiskIcon from "./Arc56RiskIcon.vue";
import TransactionGroupSimulation from "./TransactionGroupSimulation.vue";
import { useStore } from "../store";
import { getArc14Realm, isArc14AuthTransaction } from "../scripts/encoding/arc14";
import { isAssetOptIn } from "../scripts/transactionTypes";
import { signingEnvOf, type DirectNetworkView } from "../scripts/direct/networks";
import { pickSigningEnv } from "../scripts/signingEnv";
import { groupFeeShortfall } from "../scripts/fees";
import {
  checkTxGenesis,
  isBlockingGenesisCheck,
  type TxGenesisCheck,
} from "../scripts/dappRequestChecks";

type GlobalFilters = {
  formatCurrencyBigInt: (
    value?: number | bigint,
    currency?: string,
    minimumFractionDigits?: number,
    multiply?: boolean,
    language?: string | string[]
  ) => string;
  formatCurrency: (
    value?: number | bigint,
    currency?: string,
    minimumFractionDigits?: number,
    multiply?: boolean,
    language?: string | string[]
  ) => string;
  formatDateTime: (
    value?: number,
    separator?: string,
    showSeconds?: boolean,
    locale?: string,
    alwaysShowDate?: boolean
  ) => string;
  formatPercent: (value?: number) => string;
};

type SignerType = "ledger" | "msig" | "sk" | "hd" | "falcon1024" | "?";

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

const props = defineProps<{
  requests: RequestItem[];
  accountAddress?: string;
  /** Store module that owns these requests: WalletConnect (default), Liquid Auth or Biatec Direct. */
  namespace?: "wc" | "liquid" | "direct";
  /**
   * Biatec Direct only: the network the request names. When it is not the wallet's selected
   * network nothing from the wallet's own network (asset names, ARC-56 registry, simulation) is
   * shown, because it could describe a different asset or app with the same id.
   */
  network?: DirectNetworkView;
}>();

const requests = computed(() => props.requests);
const ns = computed(() => props.namespace ?? "wc");
// The Biatec Direct popup is narrow and holds exactly one request: drop the bookkeeping
// columns and show the transactions straight away.
const compact = computed(() => ns.value === "direct");
/** The request is for a network other than the wallet's selected one (Biatec Direct). */
const foreignNetwork = computed(
  () => props.network !== undefined && !props.network.matchesWalletEnv,
);

const store = useStore();
const { t } = useI18n();
const router = useRouter();

const instance = getCurrentInstance();
const proxy = instance?.proxy as
  | (ComponentPublicInstance & { $filters?: GlobalFilters })
  | undefined;
if (!proxy?.$filters) {
  throw new Error("Global filters are not available");
}
const $filters = proxy.$filters;

const selectedRequest = ref<RequestItem | null>(null);
const selectedTransaction = ref<TransactionWrapper | null>(null);
const expandedRequests = ref<RequestItem[]>([]);
const expandedTransactions = ref<TransactionWrapper[]>([]);

// Like the WalletConnect request list, the Direct popup starts collapsed: every request shows a
// one-line summary per transaction (the summary column) and opens its details on demand.

watch(
  requests,
  (list) => {
    // Asset names come from the wallet's own network: never look them up for another one.
    if (foreignNetwork.value) return;
    const assetIndexes = new Set<bigint>();
    for (const request of list) {
      for (const tx of request.transactions ?? []) {
        const assetIndex = tx.txn?.assetTransfer?.assetIndex;
        if (assetIndex) {
          assetIndexes.add(BigInt(assetIndex));
        }
      }
    }
    for (const assetIndex of assetIndexes) {
      void store.dispatch("indexer/getAsset", { assetIndex });
    }
  },
  { immediate: true, deep: true }
);

/** Compact (Direct) summary of one transaction: its kind, what moves and to whom. */
const txTypeLabel = (tx: TransactionWrapper): string =>
  isAssetOptIn(tx.txn) ? t("pay.asset_optin") : String(tx.type ?? "");
const txSummaryAmount = (tx: TransactionWrapper): string => {
  const txn = tx.txn;
  if (txn?.type === "pay") return formatNative(txn.payment?.amount);
  if (txn?.type === "axfer" && !isAssetOptIn(txn)) {
    return formatAssetAmount(
      txn.assetTransfer?.amount,
      txn.assetTransfer?.assetIndex,
    );
  }
  if (txn?.type === "appl") {
    const appIndex = txn.applicationCall?.appIndex;
    const call = onCompleteLabel(txn);
    return appIndex ? `${t("connect.app")} ${appIndex} · ${call}` : call;
  }
  return "";
};
const txSummaryTo = (tx: TransactionWrapper): string => {
  const receiver =
    tx.txn?.payment?.receiver ?? tx.txn?.assetTransfer?.receiver;
  const encoded = receiver ? encodeAddress(receiver) : "";
  return encoded === "-" ? "" : encoded;
};

// Biatec Direct: back from the multisig signing page with everything signed - the request goes
// to the site without another click (a request that only held pre-signed data is not sent here:
// the flag is only set by the signing page).
onMounted(() => {
  if (ns.value !== "direct") return;
  const returned = store.state.direct.popup.returnedFromSigning;
  if (!returned || Date.now() - returned.at > 15_000) {
    store.commit("direct/setReturnedFromSigning", null);
    return;
  }
  // Only the request holding the transaction the user just signed is sent on; the flag is kept
  // (it expires on its own) until that request is found.
  for (const request of requests.value) {
    const holdsIt = (request.transactions ?? []).some(
      (tx) => tx.txn?.txID?.() === returned.txId,
    );
    if (!holdsIt) continue;
    store.commit("direct/setReturnedFromSigning", null);
    if (allTransactionsSigned(request)) void clickAccept(request);
    break;
  }
});

const prolong = async () => {
  await store.dispatch("wallet/prolong");
};

const isASCIIText = (value: string) => /^[\x20-\x7E]*$/.test(value);

const formatData = (
  arg: Uint8Array | string,
  type: "Text" | "UInt" | "Hex" | "B64"
): string => {
  try {
    const buffer = Buffer.from(arg ?? []);
    if (buffer.length === 0) return "";
    if (type === "Text") {
      const text = buffer.toString("utf-8");
      if (!isASCIIText(text)) return "-- Non ASCII --";
      return text;
    }
    if (type === "UInt") {
      if (buffer.length !== 8) return "";
      return `Num: ${algosdk.decodeUint64(new Uint8Array(buffer))}`;
    }
    if (type === "Hex") return `Hex: 0x${buffer.toString("hex")}`;
    if (type === "B64") return `B64: ${buffer.toString("base64")}`;
    return buffer.toString();
  } catch {
    return String(arg ?? "");
  }
};

const formatAppAccount = (acc: { publicKey?: Uint8Array }) => {
  try {
    if (!acc.publicKey) return String(acc);
    return algosdk.encodeAddress(acc.publicKey);
  } catch {
    return String(acc);
  }
};

// Only ever called with algosdk.Transaction's `group` field, which is
// `Uint8Array | undefined` - no other shape is passed at any call site.
const formatGroup = (group?: Uint8Array) => {
  try {
    if (group instanceof Uint8Array) {
      return Buffer.from(group).toString("base64");
    }
  } catch {
    /* noop */
  }
  return String(group ?? "");
};

const formatGenesisHash = (genesisHash: Uint8Array | string) => {
  try {
    return Buffer.from(genesisHash).toString("base64");
  } catch {
    return String(genesisHash ?? "");
  }
};

/**
 * Biatec Direct: the network the wallet verified and showed to the user. It decides which
 * rekey mapping applies, never the transaction's own (dApp-supplied) genesis ID.
 */
const signEnv = computed(() =>
  props.network ? signingEnvOf(props.network) : undefined,
);

const getSignerTypeLocal = (from: string, genesisId?: string): SignerType => {
  const env = pickSigningEnv({
    verifiedEnv: signEnv.value,
    txGenesisId: genesisId,
    walletEnv: store.state.config.env,
  });
  if (!env) return "?";
  const baseAccount = store.state.wallet.privateAccounts.find(
    (item) => item.addr === from
  );
  if (!baseAccount) return "?";
  const envRekey = baseAccount.data?.[env]?.rekeyedTo;
  let resolvedAccount = baseAccount;
  if (typeof envRekey === "string" && envRekey !== from) {
    const rekeyAccount = store.state.wallet.privateAccounts.find(
      (item) => item.addr === envRekey
    );
    // Rekeyed (on this network) to an account this wallet does not hold: nothing here can sign.
    if (!rekeyAccount) return "?";
    resolvedAccount = rekeyAccount;
  }
  if (resolvedAccount.type === "ledger") {
    return "ledger";
  }
  if (resolvedAccount.type === "hd") {
    return "hd";
  }
  if (resolvedAccount.type === "falcon1024") {
    return "falcon1024";
  }
  if (resolvedAccount.params) {
    return "msig";
  }
  if (resolvedAccount.sk) {
    return "sk";
  }
  return "?";
};

/**
 * A Falcon-1024 signature is large, so the network charges about three minimum fees for it. The
 * site fixed the fee (and the group id), the wallet cannot raise it: when the group's pooled fees
 * do not cover what its signers need, this returns the total fee the site set (else undefined).
 */
const lowFalconFee = (request: RequestItem): number | undefined => {
  // Fees pool only inside an atomic group; an ungrouped transaction stands alone.
  const groups = new Map<string, { fee: bigint; falcon1024: boolean }[]>();
  (request.transactions ?? []).forEach((tx, index) => {
    const sender = tx.txn?.sender ? encodeAddress(tx.txn.sender) : "";
    const falcon1024 =
      sender !== "" && getSignerTypeLocal(sender, tx.txn.genesisID) === "falcon1024";
    const group = tx.txn?.group?.length
      ? Buffer.from(tx.txn.group).toString("base64")
      : `solo-${index}`;
    const members = groups.get(group) ?? [];
    members.push({ fee: BigInt(tx.txn?.fee ?? 0), falcon1024 });
    groups.set(group, members);
  });
  for (const members of groups.values()) {
    if (!members.some((m) => m.falcon1024)) continue;
    if (groupFeeShortfall(members) > 0n) {
      return Number(members.reduce((sum, m) => sum + m.fee, 0n));
    }
  }
  return undefined;
};

const _arrayBufferToBase64 = (buffer: Uint8Array) => {
  let binary = "";
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base642base64url = (input: string) =>
  input.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const clickSignAll = async (data: RequestItem) => {
  try {
    await prolong();
    const list: TransactionWrapper[] = data?.transactions ?? [];
    // AW-2026-063: one transaction of another network voids the whole request - sign none.
    if (list.some((tx) => genesisMismatch(tx.txn))) {
      await store.dispatch("toast/openError", t("connect.genesis_mismatch"));
      return;
    }
    for (const tx of list) {
      await clickSign(tx, data);
    }
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Sign all failed",
      detail: ex,
      life: 5000,
    });
  }
};

const clickSign = async (data: TransactionWrapper, parentRequest: RequestItem) => {
  try {
    const txn = data?.txn;
    if (!txn?.txID) {
      console.error("Invalid transaction, missing txID");
      return;
    }
    if (!data.txn.sender.toString()) {
      console.error("Invalid transaction, missing from address");
      return;
    }
    const txId = txn.txID();
    if (txId in (store.state.signer.signed ?? {})) {
      return;
    }
    // AW-2026-063: never sign a transaction of a network other than the selected one.
    if (genesisMismatch(txn)) {
      await store.dispatch("toast/openError", t("connect.genesis_mismatch"));
      return;
    }
    if (compact.value && isForeignTransaction(data)) return; // not ours to sign (Direct)
    const signerType = (await store.dispatch("signer/getSignerType", {
      from: data.txn.sender.toString(),
      tx: data.txn,
      env: signEnv.value,
    })) as SignerType;
    if (compact.value && signerType === "?") {
      // Biatec Direct only (WalletConnect/Liquid route "?" accounts, e.g. wc, to their own signer).
      // A transaction of another party is simply not ours to sign; for one of this wallet's own
      // accounts it means the key is gone, e.g. rekeyed on this network to an account not held here.
      await store.dispatch(
        "toast/openError",
        "This wallet cannot sign for this account on this network (it may be rekeyed to an account this wallet does not hold).",
      );
      return;
    }
    if (signerType === "msig") {
      await store.dispatch("signer/toSign", { tx: txn });
      const encoded = algosdk.encodeUnsignedTransaction(txn);
      const urldataB64 = _arrayBufferToBase64(encoded);
      const urldataB64url = base642base64url(urldataB64);
      await router.push(
        payWcPath(
          props.accountAddress,
          data.txn.sender.toString(),
          urldataB64url,
        ),
      );
    } else {
      await store.dispatch("signer/signTransaction", {
        from: data.txn.sender.toString(),
        signator: data.txn.sender.toString(),
        tx: txn,
        env: signEnv.value,
      });
      // ARC14 auth requests can't be broadcast to the chain, so there is no
      // decision left for the user to make once every transaction in the
      // request is signed - send the result straight back to the dApp
      // instead of waiting for a separate click. Only do this once the
      // *whole* request is nothing but signed ARC14 auth transactions - a
      // dApp is free to bundle an auth transaction alongside ordinary
      // payment/asset transactions in the same request, and auto-accepting
      // then would relay a response with unsigned transactions still
      // missing.
      // In the Biatec Direct popup the single request goes back to the site as soon as
      // everything in it is signed: signing is the approval, a second click would only
      // get in the way in a small window.
      if (
        allTransactionsSigned(parentRequest) &&
        (ns.value === "direct" ||
          (isArc14Auth(txn) && isArc14OnlyRequest(parentRequest)))
      ) {
        await clickAccept(parentRequest);
      }
    }
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Sign transaction failed",
      detail: ex,
      life: 5000,
    });
  }
};

// Guards against clickAccept/clickReject being dispatched twice - or against
// each other - for the same request (e.g. the ARC14 auto-accept above racing
// a manual "Send back" or "Reject" click). WalletConnect/Liquid Auth's
// sendResult/cancelRequest are one-shot terminal responses and the request
// is removed from state as soon as one succeeds, so a second call for the
// same id would either throw, silently no-op, or send a conflicting second
// response to the dApp depending on transport and which call wins the race.
const respondingRequestIds = new Set<RequestItem["id"]>();

const clickAccept = async (data: RequestItem) => {
  if (respondingRequestIds.has(data.id)) {
    return;
  }
  respondingRequestIds.add(data.id);
  await prolong();
  try {
    await store.dispatch(`${ns.value}/sendResult`, { data });
    await store.dispatch("toast/openSuccess", {
      severity: "info",
      summary: "Request accepted",
      life: 3000,
    });
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Accept request failed",
      detail: ex,
      life: 5000,
    });
  } finally {
    respondingRequestIds.delete(data.id);
  }
};

const clickReject = async (data: RequestItem) => {
  if (respondingRequestIds.has(data.id)) {
    return;
  }
  respondingRequestIds.add(data.id);
  try {
    await prolong();
    await store.dispatch(`${ns.value}/cancelRequest`, { data });
    await store.dispatch("toast/openSuccess", {
      severity: "info",
      summary: "Request rejected",
      life: 3000,
    });
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Reject request failed",
      detail: ex,
      life: 5000,
    });
  } finally {
    respondingRequestIds.delete(data.id);
  }
};

const clickCopyPayload = async (data: RequestItem) => {
  await prolong();
  try {
    const encoded = (data.transactions ?? []).map((tx: TransactionWrapper) => {
      const raw = algosdk.encodeUnsignedTransaction(tx.txn);
      return _arrayBufferToBase64(raw);
    });
    await navigator.clipboard.writeText(JSON.stringify(encoded));
    await store.dispatch("toast/openSuccess", {
      severity: "info",
      summary: "Payload copied to clipboard",
      life: 3000,
    });
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Copy payload failed",
      detail: ex,
      life: 5000,
    });
  }
};

const toBeSigned = (data: TransactionWrapper) => {
  const txn = data?.txn;
  if (!txn?.txID) return false;
  const txId = txn.txID();
  const signedMap = store.state.signer.signed ?? {};
  if (!(txId in signedMap)) {
    return true;
  }
  const fromAddress = encodeAddress(txn.sender);
  const signerType = getSignerTypeLocal(fromAddress, txn.genesisID);
  if (signerType === "msig") {
    const signedTx = algosdk.decodeSignedTransaction(signedMap[txId]);
    const subsig = signedTx.msig?.subsig ?? [];
    const threshold = signedTx.msig?.thr ?? 0;
    const signedCount = subsig.filter((s) => Boolean(s?.s)).length;
    return signedCount < threshold;
  }
  return false;
};

/**
 * Whether the request still needs the user to sign. The compact (Direct) list starts collapsed, so
 * its Sign button stays until every transaction holds a signature (a multisig below its threshold
 * is returned as it is, see hasPartialMultisig); WalletConnect's list hides it once anything is
 * signed.
 */
const needsSigning = (data: RequestItem) =>
  compact.value ? hasUnsignedTransaction(data) : !atLeastOneSigned(data);

/** A multisig transaction with some, but not enough, signatures (Direct returns it as is). */
const hasPartialMultisig = (data: RequestItem) => {
  const signedMap = store.state.signer.signed ?? {};
  return (data.transactions ?? []).some(
    (tx) => !!tx?.txn?.txID && tx.txn.txID() in signedMap && toBeSigned(tx),
  );
};

/**
 * A transaction this wallet is expected to sign (its sender is an account the wallet can sign for)
 * that has no signature yet: the request must not be sent back yet (Direct). Transactions of
 * other parties (the site's own, a co-signer's) are never ours to sign and do not hold it up.
 */
const hasUnsignedTransaction = (data: RequestItem) => {
  const signedMap = store.state.signer.signed ?? {};
  return (data.transactions ?? []).some((tx) => {
    if (!tx?.txn?.txID || isForeignTransaction(tx)) return false;
    return !(tx.txn.txID() in signedMap);
  });
};

const atLeastOneSigned = (data: RequestItem) => {
  const signedMap = store.state.signer.signed ?? {};
  return (data.transactions ?? []).some((tx: TransactionWrapper) => {
    const txn = tx?.txn;
    if (!txn?.txID) return false;
    return txn.txID() in signedMap;
  });
};

const encodeAddress = (addrValue: { publicKey?: Uint8Array }) => {
  try {
    if (!addrValue?.publicKey) return "-";
    return algosdk.encodeAddress(addrValue.publicKey);
  } catch {
    return "-";
  }
};

// closeRemainderTo (pay) / assetCloseTo (axfer) sends the account's entire
// remaining balance / asset holding to this address (audit finding
// AW-2026-001) — it must always be surfaced with a prominent warning.
/** What the app call does to the app besides running: shown so Update/Delete/CloseOut stand out. */
const onCompleteLabel = (txn: algosdk.Transaction): string => {
  const onComplete = txn?.applicationCall?.onComplete;
  switch (onComplete) {
    case algosdk.OnApplicationComplete.NoOpOC:
      return "NoOp";
    case algosdk.OnApplicationComplete.OptInOC:
      return "OptIn";
    case algosdk.OnApplicationComplete.CloseOutOC:
      return "CloseOut";
    case algosdk.OnApplicationComplete.ClearStateOC:
      return "ClearState";
    case algosdk.OnApplicationComplete.UpdateApplicationOC:
      return "UpdateApplication";
    case algosdk.OnApplicationComplete.DeleteApplicationOC:
      return "DeleteApplication";
    default:
      return "";
  }
};
const onCompleteIsDestructive = (txn: algosdk.Transaction): boolean => {
  const onComplete = txn?.applicationCall?.onComplete;
  return (
    onComplete === algosdk.OnApplicationComplete.CloseOutOC ||
    onComplete === algosdk.OnApplicationComplete.ClearStateOC ||
    onComplete === algosdk.OnApplicationComplete.UpdateApplicationOC ||
    onComplete === algosdk.OnApplicationComplete.DeleteApplicationOC
  );
};
/** Asset clawback: the account the funds really leave (differs from the sender). */
const clawbackFrom = (txn: algosdk.Transaction): string => {
  try {
    const assetSender = txn?.assetTransfer?.assetSender;
    if (!assetSender?.publicKey) return "";
    const from = encodeAddress(assetSender);
    return from === algosdk.ALGORAND_ZERO_ADDRESS_STRING ? "" : from;
  } catch {
    return "";
  }
};

const getCloseTo = (txn: algosdk.Transaction): string => {
  try {
    const closeAddr =
      txn?.payment?.closeRemainderTo ?? txn?.assetTransfer?.closeRemainderTo;
    if (!closeAddr?.publicKey) return "";
    return algosdk.encodeAddress(closeAddr.publicKey);
  } catch {
    return "";
  }
};

const genesisVerdict = (txn: algosdk.Transaction): TxGenesisCheck => {
  // Biatec Direct accepts every network and shows it in its own network card.
  if (ns.value === "direct") return "ok";
  // Compares the genesis hash (not just the dApp-chosen genesis ID) for known networks;
  // "custom" is a UI placeholder - a manually configured node has no expected network.
  return checkTxGenesis(txn, store.state.config.env);
};
/** The transaction is for another network than the selected one: it must not be signed. */
const genesisMismatch = (txn: algosdk.Transaction): boolean =>
  isBlockingGenesisCheck(genesisVerdict(txn));
/** The transaction names no genesis ID (the hash matches): warn, but allow. */
const genesisUnverified = (txn: algosdk.Transaction): boolean =>
  genesisVerdict(txn) === "missing_id";
/** A preset env with no hash of its own: the genesis ID differs from the env id (warn only). */
const genesisIdDiffers = (txn: algosdk.Transaction): boolean =>
  genesisVerdict(txn) === "id_differs";

const isArc14Auth = (txn: algosdk.Transaction) => isArc14AuthTransaction(txn);

const arc14Realm = (txn: algosdk.Transaction) => getArc14Realm(txn?.note) ?? "";

const accountName = (txn: algosdk.Transaction): string | undefined => {
  const addr = encodeAddress(txn?.sender);
  return store.state.wallet.privateAccounts.find((a) => a.addr === addr)?.name;
};

const arc14AuthenticateLabel = (txn: algosdk.Transaction): string => {
  const realm = arc14Realm(txn);
  const account = accountName(txn);
  // Falls back to the plain realm-only label both when there's no matching
  // account and when the matched account has a blank name - "with {realm}"
  // followed by nothing would look broken, so an empty name isn't treated
  // any differently from a missing one here.
  return account
    ? t("connect.arc14_authenticate_account", { realm, account })
    : t("connect.arc14_authenticate", { realm });
};

// A dApp can legally bundle an ARC14 auth transaction alongside ordinary
// (ungrouped) payment/asset transactions in the same request - only requests
// made up entirely of ARC14 auth transactions are safe to auto-accept.
const isArc14OnlyRequest = (data: RequestItem): boolean => {
  const list = data.transactions ?? [];
  return list.length > 0 && list.every((tx) => isArc14Auth(tx.txn));
};

// Reuses toBeSigned() rather than a plain `txId in signer.signed` check, since
// a multisig transaction is added to signer.signed as soon as the FIRST
// required co-signature is present, well before its threshold is met -
// toBeSigned() already decodes the msig subsig count against the threshold.
const allTransactionsSigned = (data: RequestItem): boolean => {
  // Direct: other parties' transactions (never signed here) do not keep the request open.
  const list = (data.transactions ?? []).filter(
    (tx) => !compact.value || !isForeignTransaction(tx),
  );
  return list.length > 0 && !list.some((tx) => toBeSigned(tx));
};

/** The sender is not an account of this wallet (the site's own or a co-signer's transaction). */
const isForeignTransaction = (tx: TransactionWrapper): boolean => {
  if (!tx?.txn?.sender) return true;
  const sender = encodeAddress(tx.txn.sender);
  return !store.state.wallet.privateAccounts.some((a) => a.addr === sender);
};

// ARC14 auth transactions are signed with fee=0 and are never broadcast, so
// simulating them against algod would always fail on minimum-fee validation.
// Excluded here rather than passed through so any other, real transactions
// in the same request still get simulated normally.
const simulatableTransactions = (data: RequestItem): algosdk.Transaction[] =>
  (data.transactions ?? [])
    .filter((tx: TransactionWrapper) => !isArc14Auth(tx.txn))
    .map((tx: TransactionWrapper) => tx.txn);

const signAllLabel = (data: RequestItem): string => {
  const list = data.transactions ?? [];
  if (list.length !== 1) return t("connect.sign_all");
  const txn = list[0].txn;
  if (isArc14Auth(txn)) {
    return arc14AuthenticateLabel(txn);
  }
  return t("connect.sign_single");
};

const getAssetSync = (id: bigint | number | string) => {
  // The cached assets belong to the wallet's selected network.
  if (foreignNetwork.value) return undefined;
  try {
    const normalized = BigInt(id);
    return store.state.indexer.assets.find(
      (asset) => BigInt(asset.assetId) === normalized
    );
  } catch {
    return undefined;
  }
};

const getAssetName = (id: bigint | number | string) => getAssetSync(id)?.name;

const getAssetDecimals = (id: bigint | number | string) =>
  getAssetSync(id)?.decimals ?? 0;

/**
 * Native amount / fee. On another network the currency is that network's own token; a network
 * without a known token shows the raw base units (not a guessed decimal scaling).
 */
const formatNative = (value?: number | bigint): string => {
  if (!foreignNetwork.value) return $filters.formatCurrency(value);
  const token = props.network?.token;
  return $filters.formatCurrency(value, token ?? "units", token ? 6 : 0);
};

/** Asset transfer amount: with the asset's name and decimals only when they are known locally. */
const formatAssetAmount = (
  amount: number | bigint | undefined,
  assetIndex: bigint | number | undefined,
): string => {
  if (foreignNetwork.value) {
    return $filters.formatCurrency(amount, `asset ${assetIndex ?? ""}`, 0);
  }
  return $filters.formatCurrency(
    amount,
    getAssetName(assetIndex ?? 0),
    getAssetDecimals(assetIndex ?? 0),
  );
};
</script>

<style scoped>
.detail-scroll {
  overflow-x: auto;
}
</style>
