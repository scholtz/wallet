<template>
  <div v-if="requests.length > 0">
    <h2 id="sign-data-requests">
      {{ $t("connect.arc60.requests") }}
    </h2>
    <DataTable
      v-model:expandedRows="expandedRequests"
      :value="requests"
      responsive-layout="scroll"
      :paginator="true"
      :rows="20"
    >
      <Column expander style="width: 5rem" />
      <Column field="id" :header="$t('connect.request_id')" :sortable="true" />
      <Column :header="$t('connect.method')">
        <template #body>algo_signData</template>
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
          <table>
            <tbody>
              <tr v-for="item in slotProps.data.items" :key="item.index">
                <td class="p-2">
                  <Button
                    v-if="!item.signature"
                    class="m-1"
                    :disabled="!store.state.wallet.isOpen || !item.domainValid"
                    @click="clickSign(slotProps.data, item)"
                  >
                    {{ $t("connect.arc60.sign") }}
                  </Button>
                  <Badge
                    v-else
                    severity="success"
                    :value="$t('connect.signed')"
                  />
                </td>
                <td class="p-2">
                  <div>
                    <strong>{{ $t("connect.arc60.domain") }}:</strong>
                    {{ item.domain }}
                    <Message
                      v-if="!item.domainValid"
                      severity="error"
                      class="m-0"
                    >
                      {{ $t("connect.arc60.domain_mismatch") }}
                    </Message>
                  </div>
                  <div>
                    <strong>{{ $t("connect.arc60.signer") }}:</strong>
                    <AlgorandAddress :address="item.signer" />
                  </div>
                  <div>
                    <strong>{{ $t("connect.arc60.scope") }}:</strong>
                    {{ scopeLabel(item.scope) }}
                  </div>
                  <div v-if="item.dataText !== undefined">
                    <strong>{{ $t("connect.arc60.data") }}:</strong>
                    {{ item.dataText }}
                  </div>
                  <div>
                    <strong>{{ $t("connect.arc60.data_base64") }}:</strong>
                    {{ item.data }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import AlgorandAddress from "./AlgorandAddress.vue";
import { useStore } from "../store";
import { Arc60ScopeType } from "../scripts/encoding/arc60";
import type {
  StoredSignDataItem,
  StoredSignDataRequest,
} from "../store/wc";

const props = defineProps<{
  requests: StoredSignDataRequest[];
}>();

const requests = computed(() => props.requests);

const store = useStore();

const expandedRequests = ref<StoredSignDataRequest[]>([]);

const prolong = async () => {
  await store.dispatch("wallet/prolong");
};

const scopeLabel = (scope: number): string =>
  scope === Arc60ScopeType.AUTH ? "AUTH" : String(scope);

const atLeastOneSigned = (data: StoredSignDataRequest) =>
  data.items.some((item) => Boolean(item.signature));

const clickSign = async (
  data: StoredSignDataRequest,
  item: StoredSignDataItem
) => {
  try {
    await prolong();
    await store.dispatch("wc/signSignDataItem", {
      requestId: data.id,
      index: item.index,
    });
  } catch (ex) {
    await store.dispatch("toast/openError", {
      severity: "error",
      summary: "Sign data failed",
      detail: ex,
      life: 5000,
    });
  }
};

const clickSignAll = async (data: StoredSignDataRequest) => {
  try {
    await prolong();
    for (const item of data.items) {
      if (!item.signature) {
        await clickSign(data, item);
      }
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

const clickAccept = async (data: StoredSignDataRequest) => {
  await prolong();
  try {
    await store.dispatch("wc/sendSignDataResult", { data });
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

const clickReject = async (data: StoredSignDataRequest) => {
  await prolong();
  await store.dispatch("wc/cancelSignDataRequest", { data });
  await store.dispatch("toast/openSuccess", {
    severity: "info",
    summary: "Request rejected",
    life: 3000,
  });
};
</script>
