<template>
  <div v-if="requests.length > 0">
    <h2 id="requests">
      {{ $t("connect.requests") }}
    </h2>
    <DataTable
      v-model:expandedRows="expandedRequests"
      v-model:selection="selectedRequest"
      :value="requests"
      responsive-layout="scroll"
      selection-mode="single"
      :paginator="true"
      :rows="20"
    >
      <Column expander style="width: 5rem" />
      <Column
        field="id"
        :header="$t('connect.request_id')"
        :sortable="true"
      />
      <Column
        field="method"
        :header="$t('connect.method')"
        :sortable="true"
      />
      <Column :header="$t('connect.total_fee')">
        <template #body="slotProps">
          {{ $filters.formatCurrency(slotProps.data.fee) }}
        </template>
      </Column>
      <Column>
        <template #body="slotProps">
          <Button
            class="m-1"
            v-if="!atLeastOneSigned(slotProps.data)"
            @click="clickSignAll(slotProps.data)"
          >
            {{ $t("connect.sign_all") }}
          </Button>
          <Button
            class="m-1"
            :disabled="
              !store.state.wallet.isOpen || !atLeastOneSigned(slotProps.data)
            "
            @click="clickAccept(slotProps.data)"
          >
            {{ $t("connect.sendBack") }}
          </Button>
          <Button class="m-1" @click="clickCopyPayload(slotProps.data)">
            <i class="pi pi-copy"></i>
          </Button>
          <span v-if="!atLeastOneSigned(slotProps.data)" class="m-2">
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
      <template #expansion="slotProps">
        <div class="p-3">
          <DataTable
            v-model:expandedRows="expandedTransactions"
            v-model:selection="selectedTransaction"
            :value="slotProps.data.transactions"
            selection-mode="single"
          >
            <Column expander style="width: 5rem" />
            <Column>
              <template #body="slotProps">
                <Button
                  v-if="toBeSigned(slotProps.data)"
                  class="m-1"
                  :disabled="!store.state.wallet.isOpen"
                  @click="clickSign(slotProps.data)"
                >
                  {{ $t("connect.sign") }}
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
              field="index"
              :header="$t('connect.index')"
              :sortable="true"
            />
            <Column
              field="type"
              :header="$t('connect.type')"
              :sortable="true"
            />
            <Column
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
              field="asset"
              :header="$t('connect.asset')"
              :sortable="true"
            />
            <Column
              field="amount"
              :header="$t('connect.amount')"
              :sortable="true"
            >
              <template #body="slotProps">
                <div v-if="slotProps.data.txn">
                  <div v-if="slotProps.data.txn.type == 'pay'" class="text-end">
                    {{
                      $filters.formatCurrency(slotProps.data.txn.payment?.amount)
                    }}
                  </div>
                  <div
                    v-else-if="slotProps.data.txn.type == 'axfer'"
                    class="text-end"
                  >
                    {{
                      $filters.formatCurrency(
                        slotProps.data.txn.assetTransfer?.amount,
                        getAssetName(slotProps.data.txn.assetTransfer?.assetIndex),
                        getAssetDecimals(
                          slotProps.data.txn.assetTransfer?.assetIndex
                        )
                      )
                    }}
                  </div>
                </div>
              </template>
            </Column>
            <Column field="fee" :header="$t('connect.fee')" :sortable="true">
              <template #body="slotProps">
                {{ $filters.formatCurrency(slotProps.data["fee"]) }}
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
              <div class="p-3">
                <table>
                  <tbody>
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
                      <td>{{ txProps.data.type }}</td>
                    </tr>
                    <tr>
                      <td>{{ $t("connect.note") }}:</td>
                      <td>
                        <table>
                          <tbody>
                            <tr>
                              <td>
                                {{ formatData(txProps.data.txn.note, "Text") }}
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

                    <tr v-if="txProps.data.type == 'appl'">
                      <td>{{ $t("connect.app") }}:</td>
                      <td>
                        {{ txProps.data.txn.applicationCall?.appIndex }}
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
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script lang="ts" setup>
import { Buffer } from "buffer";
import algosdk from "algosdk";
import {
  computed,
  getCurrentInstance,
  ref,
  type ComponentPublicInstance,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import AlgorandAddress from "./AlgorandAddress.vue";
import { useStore } from "../store";

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

type SignerType = "ledger" | "msig" | "sk" | "?";

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
}>();

const requests = computed(() => props.requests);

const store = useStore();
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

watch(
  requests,
  (list) => {
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

const formatGroup = (group: unknown) => {
  try {
    if (group instanceof Uint8Array) {
      return Buffer.from(group).toString("base64");
    }
    if (typeof (group as any)?.toString === "function") {
      return (group as any).toString("base64");
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

const getSignerTypeLocal = (from: string): SignerType => {
  const env = store.state.config.env;
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
    if (rekeyAccount) {
      resolvedAccount = rekeyAccount;
    }
  }
  if (resolvedAccount.type === "ledger") {
    return "ledger";
  }
  if (resolvedAccount.params) {
    return "msig";
  }
  if (resolvedAccount.sk) {
    return "sk";
  }
  return "?";
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
    for (const tx of list) {
      await clickSign(tx);
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

const clickSign = async (data: TransactionWrapper) => {
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
    const signerType = (await store.dispatch("signer/getSignerType", {
      from: data.txn.sender.toString(),
    })) as SignerType;
    if (signerType === "msig") {
      await store.dispatch("signer/toSign", { tx: txn });
      const encoded = algosdk.encodeUnsignedTransaction(txn);
      const urldataB64 = _arrayBufferToBase64(encoded);
      const urldataB64url = base642base64url(urldataB64);
      await router.push(`/payWC/${props.accountAddress}/${urldataB64url}`);
    } else {
      await store.dispatch("signer/signTransaction", {
        from: data.txn.sender.toString(),
        signator: data.txn.sender.toString(),
        tx: txn,
      });
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

const clickAccept = async (data: RequestItem) => {
  await prolong();
  try {
    await store.dispatch("wc/sendResult", { data });
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
  }
};

const clickReject = async (data: RequestItem) => {
  await prolong();
  await store.dispatch("wc/cancelRequest", { data });
  await store.dispatch("toast/openSuccess", {
    severity: "info",
    summary: "Request rejected",
    life: 3000,
  });
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
  const signerType = getSignerTypeLocal(fromAddress);
  if (signerType === "msig") {
    const signedTx = algosdk.decodeSignedTransaction(signedMap[txId]);
    const subsig = signedTx.msig?.subsig ?? [];
    const threshold = signedTx.msig?.thr ?? 0;
    const signedCount = subsig.filter((s) => Boolean(s?.s)).length;
    return signedCount < threshold;
  }
  return false;
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

const genesisMismatch = (txn: algosdk.Transaction): boolean => {
  const genesisId = txn?.genesisID;
  const env = store.state.config.env;
  return Boolean(genesisId && env && genesisId !== env);
};

const getAssetSync = (id: bigint | number | string) => {
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
</script>
