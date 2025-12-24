<template>
  <div class="grid">
    <div class="col-6">
      <h1>{{ t("acc_overview.title") }} - {{ accountName ?? "" }}</h1>
    </div>
    <div class="col-6">
      <div class="text-right">
        <Button
          severity="danger"
          size="small"
          class="m-2 align-items-end"
          @click="displayDeleteDialog = true"
        >
          <div>{{ t("acc_overview.delete") }}</div>
        </Button>

        <Button
          v-if="account"
          severity="secondary"
          size="small"
          class="m-2 align-items-end"
          @click="emit('toggle-visibility')"
        >
          <div v-if="account?.isHidden">
            {{ t("acc_overview.unhide_account") }}
          </div>
          <div v-else>{{ t("acc_overview.hide_account") }}</div>
        </Button>
      </div>
    </div>
  </div>

  <Dialog
    v-model:visible="displayDeleteDialog"
    :header="t('acc_overview.delete_header')"
    :modal="true"
    class="m-5"
  >
    <p>{{ t("acc_overview.delete_confirm") }}</p>
    <p v-if="account">
      <b>{{ account.name }}</b>
    </p>
    <p v-if="account">
      {{ account.addr }}
    </p>

    <template #footer>
      <Button size="small" @click="displayDeleteDialog = false">
        {{ t("global.cancel") }}
      </Button>
      <Button size="small" severity="danger" @click="handleDelete">
        {{ t("acc_overview.delete_confirm_button") }}
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import type { PrivateAccount } from "@/types/account";

const props = defineProps<{
  account?: PrivateAccount;
  accountName?: string;
}>();

const emit = defineEmits<{
  (e: "delete"): void;
  (e: "toggle-visibility"): void;
}>();

const displayDeleteDialog = ref(false);
const { t } = useI18n();
const { account, accountName } = toRefs(props);

const handleDelete = () => {
  emit("delete");
  displayDeleteDialog.value = false;
};
</script>
