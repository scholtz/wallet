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
            {{ t("navbar.asset_create") }}
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
      <Message v-if="loadFailed" severity="warn" data-testid="asset-hub-load-failed">
        {{ t("asset_manage.created_assets_failed") }}
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
          <template #body="{ data }">{{ data.asset.assetId.toString() }}</template>
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
            {{ data.roles.map((r: AssetRole) => t(`asset_manage.role_${r}`)).join(", ") || "-" }}
          </template>
        </Column>
        <Column>
          <template #body="{ data }">
            <RouterLink :to="assetActionPath(data.asset.assetId)">
              <Button size="small" :data-testid="`asset-hub-manage-${data.asset.assetId}`">
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
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import MainLayout from "../layouts/Main.vue";
import { useStore } from "@/store";
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
const { t } = useI18n();

const assetIdInput = ref("");
const parsedAssetId = computed(() => parseAssetId(assetIdInput.value.trim()));
const openById = () => {
  if (parsedAssetId.value) router.push(assetActionPath(parsedAssetId.value));
};

const created = ref<ManagedAsset[]>([]);
const loading = ref(false);
const loadFailed = ref(false);

const rows = computed((): Row[] => {
  const accounts = store.state.wallet.privateAccounts;
  const nameOf = (addr: string) =>
    accounts.find((a) => a.addr === addr)?.name || addr;
  const own = new Set(accounts.map((a) => a.addr));
  return created.value.map((asset) => ({
    key: asset.assetId.toString(),
    asset,
    creatorName: nameOf(asset.creator),
    roles: ASSET_ROLES.filter((role) => own.has(asset.roles[role])),
  }));
});

onMounted(async () => {
  loading.value = true;
  try {
    const addresses = [
      ...new Set(store.state.wallet.privateAccounts.map((a) => a.addr)),
    ];
    const results = await Promise.allSettled(
      addresses.map(
        (addr) =>
          store.dispatch("indexer/getCreatedAssets", { addr }) as Promise<
            ManagedAsset[]
          >,
      ),
    );
    const byId = new Map<string, ManagedAsset>();
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Unable to list created assets", result.reason);
        loadFailed.value = true;
        continue;
      }
      for (const asset of result.value) byId.set(asset.assetId.toString(), asset);
    }
    created.value = [...byId.values()].sort((a, b) =>
      a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0,
    );
  } finally {
    loading.value = false;
  }
});
</script>
