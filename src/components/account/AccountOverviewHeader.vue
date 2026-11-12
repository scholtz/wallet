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
    @hide="password = ''"
  >
    <p>{{ t("acc_overview.delete_confirm") }}</p>
    <p v-if="account">
      <b>{{ account.name }}</b>
    </p>
    <p v-if="account">
      <AlgorandAddress :address="account.addr" />
    </p>
    <!-- Deleting an account that holds its own key is irreversible: not backed up, and the
         wallet password is required again (AW-2026-119). -->
    <Message
      v-if="holdsSecret && account?.backedUp === false"
      severity="error"
      class="my-2"
      data-testid="delete-not-backed-up"
    >
      {{ t("acc_overview.delete_not_backed_up") }}
    </Message>
    <div v-if="holdsSecret" class="field">
      <label for="delete_account_password" class="font-bold">
        {{ t("acc_overview.delete_password") }}
      </label>
      <Password
        v-model="password"
        input-id="delete_account_password"
        :feedback="false"
        toggle-mask
        class="w-full"
        input-class="w-full"
        @keyup.enter="handleDelete"
      />
    </div>

    <template #footer>
      <Button size="small" @click="cancelDelete">
        {{ t("global.cancel") }}
      </Button>
      <Button
        size="small"
        severity="danger"
        :disabled="holdsSecret && !password"
        @click="handleDelete"
      >
        {{ t("acc_overview.delete_confirm_button") }}
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import Password from "primevue/password";
import Message from "primevue/message";
import { accountHoldsSecret } from "@/scripts/walletPersist";
import { useI18n } from "vue-i18n";
import AlgorandAddress from "@/components/AlgorandAddress.vue";
import type { PrivateAccount } from "@/types/account";

const props = defineProps<{
  account?: PrivateAccount;
  accountName?: string;
}>();

const emit = defineEmits<{
  (e: "delete", password: string): void;
  (e: "toggle-visibility"): void;
}>();

const displayDeleteDialog = ref(false);
const { t } = useI18n();
const { account, accountName } = toRefs(props);

const password = ref("");
const holdsSecret = computed(() => !!account.value && accountHoldsSecret(account.value));

const cancelDelete = () => {
  password.value = "";
  displayDeleteDialog.value = false;
};

const handleDelete = () => {
  // The password never stays in the component, whatever the outcome.
  const pass = password.value;
  if (holdsSecret.value && !pass) return;
  password.value = "";
  // The dialog stays open: a failed delete (wrong password) is retried without reopening it, and a
  // successful one navigates away.
  emit("delete", pass);
};
</script>
