<template>
  <Dialog
    :visible="props.visible"
    @update:visible="(v: boolean) => emit('update:visible', v)"
    modal
    :header="t('assets_overview.manage_profiles')"
    :style="{ width: '60rem', maxWidth: '95vw' }"
  >
    <div class="grid">
      <div class="col-4">
        <Button
          class="mb-2 w-full"
          icon="pi pi-plus"
          :label="t('assets_overview.new_profile')"
          @click="startNewProfile"
        />
        <div
          v-for="profile in profiles"
          :key="profile.id"
          class="flex align-items-center justify-content-between p-2 border-round mb-1"
          :class="{ 'surface-100': editingProfile?.id === profile.id }"
        >
          <div class="cursor-pointer flex-grow-1" @click="editProfile(profile)">
            <div>{{ profile.name }}</div>
            <Badge
              :severity="profile.mode === 'whitelist' ? 'success' : 'warning'"
              :value="profile.mode"
            />
          </div>
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            @click="deleteProfile(profile.id)"
          />
        </div>
      </div>

      <div class="col-8" v-if="editingProfile">
        <div class="field grid">
          <label class="col-fixed" style="width: 120px">{{
            t("assets_overview.profile_name")
          }}</label>
          <div class="col">
            <InputText v-model="editingProfile.name" class="w-full" />
          </div>
        </div>
        <div class="field grid">
          <label class="col-fixed" style="width: 120px">{{
            t("assets_overview.profile_mode")
          }}</label>
          <div class="col">
            <Select
              v-model="editingProfile.mode"
              :options="modeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
        </div>

        <div
          v-for="rule in editingProfile.rules"
          :key="rule.id"
          class="flex align-items-center gap-2 mb-2"
        >
          <Select
            v-model="rule.accountAddr"
            :options="accountOptions"
            optionLabel="label"
            optionValue="value"
            show-clear
            :placeholder="t('assets_overview.any_account')"
            class="flex-grow-1"
          />
          <Select
            v-model="rule.assetKey"
            :options="assetOptions"
            optionLabel="label"
            optionValue="value"
            show-clear
            :placeholder="t('assets_overview.any_asset')"
            class="flex-grow-1"
            @update:model-value="onRuleAssetChange(rule)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            @click="removeRule(rule.id)"
          />
        </div>
        <Button
          icon="pi pi-plus"
          :label="t('assets_overview.add_rule')"
          text
          @click="addRule"
        />

        <div class="mt-3 flex gap-2">
          <Button
            :label="t('assets_overview.save_profile')"
            icon="pi pi-check"
            @click="saveProfile"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button
        :label="t('assets_overview.close')"
        text
        @click="emit('update:visible', false)"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import cryptoRandomString from "crypto-random-string";
import Badge from "primevue/badge";
import { useStore } from "@/store";
import type { AssetProfile, AssetProfileRule } from "@/store/config";
import type { AssetOverviewRow } from "@/scripts/aggregators/assetsOverview";

const props = defineProps<{
  visible: boolean;
  rows: AssetOverviewRow[];
}>();
const emit = defineEmits<{
  "update:visible": [boolean];
}>();

const store = useStore();
const { t } = useI18n();

type EditableRule = AssetProfileRule & { assetKey?: string };
type EditableProfile = Omit<AssetProfile, "rules"> & { rules: EditableRule[] };

const editingProfile = ref<EditableProfile | undefined>(undefined);

const profiles = computed(() => store.state.config.assetProfiles);

const modeOptions = computed(() => [
  { label: t("assets_overview.blacklist"), value: "blacklist" },
  { label: t("assets_overview.whitelist"), value: "whitelist" },
]);

const accountOptions = computed(() =>
  store.state.wallet.privateAccounts.map((a) => ({
    label: `${a.name ?? a.addr}`,
    value: a.addr,
  }))
);

const assetOptions = computed(() => {
  const seen = new Map<string, { label: string; value: string }>();
  for (const row of props.rows) {
    const key = `${row.assetType}:${row.assetId}`;
    if (!seen.has(key)) {
      seen.set(key, {
        label: `${row.name || row.unitName} (${row.assetType} ${row.assetId})`,
        value: key,
      });
    }
  }
  return Array.from(seen.values());
});

const ruleToEditable = (rule: AssetProfileRule): EditableRule => ({
  ...rule,
  assetKey:
    rule.assetId !== undefined ? `${rule.assetType}:${rule.assetId}` : undefined,
});

const onRuleAssetChange = (rule: EditableRule) => {
  if (!rule.assetKey) {
    rule.assetId = undefined;
    rule.assetType = undefined;
    return;
  }
  const [assetType, assetId] = rule.assetKey.split(":");
  rule.assetType = assetType as AssetProfileRule["assetType"];
  rule.assetId = assetId;
};

const startNewProfile = () => {
  editingProfile.value = {
    id: cryptoRandomString({ length: 16, type: "alphanumeric" }),
    name: "",
    mode: "blacklist",
    rules: [],
  };
};

const editProfile = (profile: AssetProfile) => {
  editingProfile.value = {
    ...profile,
    rules: profile.rules.map(ruleToEditable),
  };
};

const addRule = () => {
  if (!editingProfile.value) return;
  editingProfile.value.rules.push({
    id: cryptoRandomString({ length: 16, type: "alphanumeric" }),
  });
};

const removeRule = (id: string) => {
  if (!editingProfile.value) return;
  editingProfile.value.rules = editingProfile.value.rules.filter(
    (r) => r.id !== id
  );
};

const saveProfile = async () => {
  if (!editingProfile.value) return;
  const { name, mode, id, rules } = editingProfile.value;
  const cleanRules: AssetProfileRule[] = rules.map((r) => ({
    id: r.id,
    accountAddr: r.accountAddr,
    assetId: r.assetId,
    assetType: r.assetType,
  }));
  await store.dispatch("config/upsertAssetProfile", {
    id,
    name,
    mode,
    rules: cleanRules,
  } as AssetProfile);
  editingProfile.value = undefined;
};

const deleteProfile = async (id: string) => {
  await store.dispatch("config/deleteAssetProfile", id);
  if (editingProfile.value?.id === id) {
    editingProfile.value = undefined;
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      editingProfile.value = undefined;
    }
  }
);
</script>
