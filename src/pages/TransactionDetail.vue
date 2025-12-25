<template>
  <MainLayout>
    <h1>{{ $t("transaction.title") }}</h1>

    <Card>
      <template #content>
        <table v-if="transaction" class="w-100">
          <tbody>
            <tr>
              <th>{{ $t("transaction.tr_id") }}:</th>
              <td>{{ transaction["id"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.time") }}:</th>
              <td>{{ filters.formatDateTime(transaction["round-time"]) }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.tr_type") }}:</th>
              <td>{{ transaction["tx-type"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.note") }}:</th>
              <td>
                <b>{{ $t("transaction.note_raw") }}:</b><br />
                <code>{{ transaction["note"] }}</code>
                <div>
                  <b>{{ $t("transaction.note_decoded") }}:</b><br />
                  <code v-if="isBase64(transaction['note'])">{{
                    fromB64(transaction["note"])
                  }}</code>
                </div>
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.created_asset") }}:</th>
              <td>{{ transaction["created-asset-index"] }}</td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_name") }}:</th>
              <td>
                {{ transaction["asset-config-transaction"]["params"]["name"] }}
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_creator") }}:</th>
              <td>
                <router-link
                  v-if="
                    transaction['asset-config-transaction'] &&
                    transaction['asset-config-transaction']['params'] &&
                    transaction['asset-config-transaction']['params']['creator']
                  "
                  :to="
                    '/account/' +
                    transaction['asset-config-transaction']['params']['creator']
                  "
                >
                  <Button severity="secondary" size="small">
                    {{
                      transaction["asset-config-transaction"]["params"][
                        "creator"
                      ]
                    }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_manager") }}:</th>
              <td>
                <router-link
                  v-if="
                    transaction['asset-config-transaction'] &&
                    transaction['asset-config-transaction']['params'] &&
                    transaction['asset-config-transaction']['params']['manager']
                  "
                  :to="
                    '/account/' +
                    transaction['asset-config-transaction']['params']['manager']
                  "
                >
                  <Button severity="secondary" size="small">
                    {{
                      transaction["asset-config-transaction"]["params"][
                        "manager"
                      ]
                    }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_reserve") }}:</th>
              <td>
                <router-link
                  v-if="
                    transaction['asset-config-transaction'] &&
                    transaction['asset-config-transaction']['params'] &&
                    transaction['asset-config-transaction']['params']['reserve']
                  "
                  :to="
                    '/account/' +
                    transaction['asset-config-transaction']['params']['reserve']
                  "
                >
                  <Button severity="secondary" size="small">
                    {{
                      transaction["asset-config-transaction"]["params"][
                        "reserve"
                      ]
                    }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_freeze") }}:</th>
              <td>
                <router-link
                  v-if="
                    transaction['asset-config-transaction'] &&
                    transaction['asset-config-transaction']['params'] &&
                    transaction['asset-config-transaction']['params']['freeze']
                  "
                  :to="
                    '/account/' +
                    transaction['asset-config-transaction']['params']['freeze']
                  "
                >
                  <Button severity="secondary" size="small">
                    {{
                      transaction["asset-config-transaction"]["params"][
                        "freeze"
                      ]
                    }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_clawback") }}:</th>
              <td>
                <router-link
                  v-if="
                    transaction['asset-config-transaction'] &&
                    transaction['asset-config-transaction']['params'] &&
                    transaction['asset-config-transaction']['params'][
                      'clawback'
                    ]
                  "
                  :to="
                    '/account/' +
                    transaction['asset-config-transaction']['params'][
                      'clawback'
                    ]
                  "
                >
                  <Button severity="secondary" size="small">
                    {{
                      transaction["asset-config-transaction"]["params"][
                        "clawback"
                      ]
                    }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_unitName") }}:</th>
              <td>
                {{
                  transaction["asset-config-transaction"]["params"]["unit-name"]
                }}
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_total") }}:</th>
              <td>
                {{ transaction["asset-config-transaction"]["params"]["total"] }}
                {{
                  transaction["asset-config-transaction"]["params"]["unit-name"]
                }}
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_decimals") }}:</th>
              <td>
                {{
                  transaction["asset-config-transaction"]["params"]["decimals"]
                }}
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_defaultfrozen") }}:</th>
              <td>
                {{
                  transaction["asset-config-transaction"]["params"][
                    "default-frozen"
                  ]
                }}
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_url") }}:</th>
              <td>
                {{ transaction["asset-config-transaction"]["params"]["url"] }}
              </td>
            </tr>
            <tr v-if="transaction['asset-config-transaction']">
              <th>{{ $t("transaction.asset_metadata") }}:</th>
              <td>
                {{
                  transaction["asset-config-transaction"]["params"][
                    "metadata-hash"
                  ]
                }}
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.tr_close_rewards") }}:</th>
              <td>
                {{ filters.formatCurrency(transaction["close-rewards"]) }}
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.closing_amount") }}:</th>
              <td>
                {{ filters.formatCurrency(transaction["closing-amount"]) }}
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.confirmed_round") }}:</th>
              <td>{{ transaction["confirmed-round"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.fee") }}:</th>
              <td>{{ filters.formatCurrency(transaction["fee"]) }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.first_valid") }}:</th>
              <td>{{ transaction["first-valid"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.group") }}:</th>
              <td>{{ transaction["group"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.genesis_id") }}:</th>
              <td>{{ transaction["genesis-id"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.genesis_hash") }}:</th>
              <td>{{ transaction["genesis-hash"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.intra_round") }}:</th>
              <td>{{ transaction["intra-round-offset"] }}</td>
            </tr>
            <tr>
              <th>{{ $t("transaction.last_valid") }}:</th>
              <td>{{ transaction["last-valid"] }}</td>
            </tr>
            <tr v-if="transaction['asset-transfer-transaction']">
              <th>{{ $t("transaction.amount") }}:</th>
              <td>
                {{
                  filters.formatCurrency(
                    transaction["asset-transfer-transaction"]["amount"],
                    assetObj.name,
                    assetObj.decimals
                  )
                }}
                ({{ transaction["asset-transfer-transaction"].assetId }})
              </td>
            </tr>
            <tr v-if="transaction['asset-transfer-transaction']">
              <th>{{ $t("transaction.receiver") }}:</th>
              <td>
                <router-link
                  :to="
                    '/account/' +
                    transaction['asset-transfer-transaction']['receiver']
                  "
                >
                  <Button severity="secondary" size="small">
                    {{ transaction["asset-transfer-transaction"]["receiver"] }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr v-if="transaction['payment-transaction']">
              <th>{{ $t("transaction.close_amount") }}:</th>
              <td>
                {{
                  filters.formatCurrency(
                    transaction["payment-transaction"]["close-amount"]
                  )
                }}
              </td>
            </tr>
            <tr v-if="transaction['payment-transaction']">
              <th>{{ $t("transaction.amount") }}:</th>
              <td>
                {{
                  filters.formatCurrency(
                    transaction["payment-transaction"]["amount"]
                  )
                }}
              </td>
            </tr>
            <tr v-if="transaction['payment-transaction']">
              <th>{{ $t("transaction.close_amount") }}:</th>
              <td>
                {{
                  filters.formatCurrency(
                    transaction["payment-transaction"]["close-amount"]
                  )
                }}
              </td>
            </tr>
            <tr v-if="transaction['payment-transaction']">
              <th>{{ $t("transaction.receiver") }}:</th>
              <td>
                <router-link
                  :to="
                    '/account/' + transaction['payment-transaction']['receiver']
                  "
                >
                  <Button severity="secondary" size="small">
                    {{ transaction["payment-transaction"]["receiver"] }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.receiver_rewards") }}:</th>
              <td>
                {{ filters.formatCurrency(transaction["receiver-rewards"]) }}
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.sender") }}:</th>
              <td>
                <router-link :to="'/account/' + transaction['sender']">
                  <Button severity="secondary" size="small">
                    {{ transaction["sender"] }}
                  </Button>
                </router-link>
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.sender_rewards") }}:</th>
              <td>
                {{ filters.formatCurrency(transaction["sender-rewards"]) }}
              </td>
            </tr>
            <tr>
              <th>{{ $t("transaction.signature") }}:</th>
              <td>{{ transaction["signature"]["sig"] }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </Card>
  </MainLayout>
</template>

<script lang="ts" setup>
import {
  type ComponentPublicInstance,
  computed,
  getCurrentInstance,
  ref,
  watch,
} from "vue";
import { useStore } from "../store";
import MainLayout from "../layouts/Main.vue";
import type { StoredAsset } from "../store/indexer";

type AssetViewModel = {
  assetId: bigint;
  name: string;
  decimals: number;
};

type Filters = {
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

const instance = getCurrentInstance();
const proxy = instance?.proxy as
  | (ComponentPublicInstance & { $filters?: Filters })
  | undefined;
if (!proxy?.$filters) {
  throw new Error("Global filters are not available");
}
const filters = proxy.$filters;

const DEFAULT_ASSET: AssetViewModel = {
  assetId: 0n,
  name: "ALGO",
  decimals: 6,
};

const assetObj = ref<AssetViewModel>({ ...DEFAULT_ASSET });
const store = useStore();

const transaction = computed<Record<string, any>>(
  () => store.state.wallet.transaction ?? {}
);

const resetAsset = () => {
  assetObj.value = { ...DEFAULT_ASSET };
};

const applyAssetResult = (asset?: StoredAsset) => {
  if (!asset) {
    resetAsset();
    return;
  }
  assetObj.value = {
    assetId: asset.assetId,
    name: asset.name ?? DEFAULT_ASSET.name,
    decimals: asset.decimals ?? DEFAULT_ASSET.decimals,
  };
};

const loadAsset = async () => {
  const assetTransfer = transaction.value["asset-transfer-transaction"];
  const assetId = assetTransfer?.assetId;

  if (!assetId) {
    resetAsset();
    return;
  }

  try {
    const asset = (await store.dispatch("indexer/getAsset", {
      assetIndex: assetId,
    })) as StoredAsset | undefined;
    applyAssetResult(asset);
  } catch (error) {
    console.error("loadAsset", error);
    resetAsset();
  }
};

const isBase64 = (raw?: string | null): boolean => {
  if (!raw) return false;
  const value = raw.trim();
  if (!value) return false;
  try {
    return btoa(atob(value)) === value;
  } catch (err) {
    return false;
  }
};

const fromB64 = (value: string): string => atob(value);

watch(
  transaction,
  () => {
    void loadAsset();
  },
  { immediate: true }
);
</script>
