<template>
  <MainLayout>
    <div class="container-fluid">
      <h1>
        <span class="page-title-icon"
          ><i class="pi pi-database" aria-hidden="true"
        /></span>
        {{ t("asset_manage.hub_title") }}
      </h1>
      <p>{{ t("asset_manage.hub_help") }}</p>
      <div class="flex flex-wrap gap-2 mb-3">
        <RouterLink to="/asset/create">
          <Button severity="secondary">
            <i class="pi pi-plus mr-2" />
            {{ t("asset_manage.create_asset") }}
          </Button>
        </RouterLink>
      </div>

      <div class="field grid">
        <label for="manageAssetId" class="col-12 mb-2 md:col-3 md:mb-0">
          {{ t("asset_manage.manage_by_id") }}
        </label>
        <div class="col-12 md:col-9">
          <InputGroup>
            <InputText
              id="manageAssetId"
              v-model="assetIdInput"
              inputmode="numeric"
              data-testid="asset-hub-id"
              @keyup.enter="openById"
            />
            <Button
              :disabled="!parsedAssetId"
              data-testid="asset-hub-open"
              @click="openById"
            >
              {{ t("asset_manage.open") }}
            </Button>
          </InputGroup>
        </div>
      </div>

      <h2>{{ t("asset_manage.created_assets") }}</h2>
      <Message
        v-if="failedAccounts.length"
        severity="warn"
        data-testid="asset-hub-load-failed"
      >
        {{
          t("asset_manage.created_assets_failed", {
            accounts: failedAccounts.join(", "),
          })
        }}
      </Message>
      <DataTable
        :value="rows"
        :loading="loading"
        data-key="key"
        responsive-layout="scroll"
        data-testid="asset-hub-table"
      >
        <template #empty>{{ t("asset_manage.created_assets_empty") }}</template>
        <Column :header="t('asset_manage.asset_id')">
          <template #body="{ data }">{{
            data.asset.assetId.toString()
          }}</template>
        </Column>
        <Column :header="t('asset_manage.name')">
          <template #body="{ data }">
            {{ data.asset.name }}
            <span v-if="data.asset.unitName">({{ data.asset.unitName }})</span>
          </template>
        </Column>
        <Column :header="t('asset_manage.creator')">
          <template #body="{ data }">{{ data.creatorName }}</template>
        </Column>
        <Column :header="t('asset_manage.wallet_roles')">
          <template #body="{ data }">
            {{
              data.roles
                .map((r: AssetRole) => t(`asset_manage.role_${r}`))
                .join(", ") || "-"
            }}
          </template>
        </Column>
        <Column>
          <template #body="{ data }">
            <RouterLink :to="assetActionPath(data.asset.assetId)">
              <Button
                size="small"
                :data-testid="`asset-hub-manage-${data.asset.assetId}`"
              >
                {{ t("asset_manage.manage") }}
              </Button>
            </RouterLink>
          </template>
        </Column>
      </DataTable>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import MainLayout from "../layouts/Main.vue";
import { useStore } from "@/store";
import { useSignAllHandoff } from "@/composables/useSignAllHandoff";
import {
  ASSET_ROLES,
  assetActionPath,
  parseAssetId,
  type AssetRole,
  type ManagedAsset,
} from "@/scripts/assets/management";

interface Row {
  key: string;
  asset: ManagedAsset;
  creatorName: string;
  /** Roles of the asset held by any account of this wallet. */
  roles: AssetRole[];
}

const store = useStore();
const router = useRouter();
const route = useRoute();
const { signingRouteFor } = useSignAllHandoff();
// The page the destroy action came from names the asset that is gone; the indexer may still list it.
const destroyedId = (() => {
  const raw = route.query.destroyed;
  return typeof raw === "string" ? parseAssetId(raw)?.toString() : undefined;
})();
const { t } = useI18n();

const assetIdInput = ref("");
const parsedAssetId = computed(() => parseAssetId(assetIdInput.value.trim()));
const openById = () => {
  if (parsedAssetId.value) router.push(assetActionPath(parsedAssetId.value));
};

const created = ref<ManagedAsset[]>([]);
const loading = ref(false);
/** Names (or addresses) of the accounts whose created assets could not be listed. */
const failedAccounts = ref<string[]>([]);

/** Wallet accounts that sign for a role - decided like the manage page does. */
const signable = ref<Set<string>>(new Set());

const rows = computed((): Row[] => {
  const accounts = store.state.wallet.privateAccounts;
  const nameOf = (addr: string) =>
    accounts.find((a) => a.addr === addr)?.name || addr;
  return created.value.map((asset) => ({
    key: asset.assetId.toString(),
    asset,
    creatorName: nameOf(asset.creator),
    roles: ASSET_ROLES.filter((role) => signable.value.has(asset.roles[role])),
  }));
});

const resolveSignable = async (assets: ManagedAsset[], request: number) => {
  const accounts = new Set(
    store.state.wallet.privateAccounts.map((a) => a.addr),
  );
  const candidates = new Set<string>();
  for (const asset of assets) {
    for (const role of ASSET_ROLES) {
      if (accounts.has(asset.roles[role])) candidates.add(asset.roles[role]);
    }
  }
  const found = new Set<string>();
  await Promise.all(
    [...candidates].map(async (addr) => {
      if ((await signingRouteFor(addr)) !== "none") found.add(addr);
    }),
  );
  if (request === loadCounter) signable.value = found;
};

/** Accounts asked at the same time: a public indexer rate-limits a burst of requests. */
const CONCURRENCY = 4;

let loadCounter = 0;

const loadCreated = async () => {
  // The wallet may open or change while a load runs: only the latest load may write the page.
  const request = ++loadCounter;
  loading.value = true;
  try {
    const accounts = store.state.wallet.privateAccounts;
    const addresses = [...new Set(accounts.map((a) => a.addr))];
    const byId = new Map<string, ManagedAsset>();
    const failed: string[] = [];
    for (let i = 0; i < addresses.length; i += CONCURRENCY) {
      const batch = addresses.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(
          (addr) =>
            store.dispatch("indexer/getCreatedAssets", { addr }) as Promise<
              ManagedAsset[]
            >,
        ),
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error("Unable to list created assets", result.reason);
          const addr = batch[index];
          failed.push(accounts.find((a) => a.addr === addr)?.name || addr);
          return;
        }
        for (const asset of result.value) {
          if (asset.assetId.toString() !== destroyedId) {
            byId.set(asset.assetId.toString(), asset);
          }
        }
      });
    }
    if (request !== loadCounter) return;
    failedAccounts.value = failed;
    created.value = [...byId.values()].sort((a, b) =>
      a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0,
    );
    await resolveSignable(created.value, request);
  } finally {
    if (request === loadCounter) loading.value = false;
  }
};

onMounted(loadCreated);
// The wallet may be opened (or accounts change) while this page is shown.
watch(
  () => store.state.wallet.privateAccounts.map((a) => a.addr).join(","),
  loadCreated,
);
</script>
