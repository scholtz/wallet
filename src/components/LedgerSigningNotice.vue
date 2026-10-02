<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    :close-on-escape="false"
    :draggable="false"
    :header="$t('ledger_signing.title')"
    :style="{ width: '28rem', maxWidth: '95vw' }"
    data-testid="ledger-signing-notice"
  >
    <div class="flex flex-column align-items-center gap-3 text-center">
      <ProgressSpinner
        style="width: 3.5rem; height: 3.5rem"
        strokeWidth="5"
        :aria-label="$t('ledger_signing.title')"
      />
      <p class="m-0">{{ $t("ledger_signing.instruction") }}</p>
      <!-- The wait has no timeout of its own (e.g. device locked), so the user
           must never be trapped behind the modal. Signing keeps waiting. -->
      <Button
        :label="$t('ledger_signing.hide')"
        severity="secondary"
        text
        data-testid="ledger-signing-hide"
        @click="dismissed = true"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useStore } from "@/store";

const store = useStore();
const pending = computed(() => store.state.signer.ledgerPendingIds.length > 0);
const dismissed = ref(false);
// Sequential signatures (SignAll) briefly drop to zero pending requests between
// transactions; holding the notice for a moment avoids flicker and keeps a
// user's "Hide" for the whole batch.
const HOLD_MS = 600;
const shown = ref(pending.value);
let holdTimer: ReturnType<typeof setTimeout> | undefined;
const visible = computed(() => shown.value && !dismissed.value);

watch(pending, (isPending) => {
  clearTimeout(holdTimer);
  if (isPending) {
    shown.value = true;
  } else {
    holdTimer = setTimeout(() => {
      shown.value = false;
      dismissed.value = false;
    }, HOLD_MS);
  }
});

onBeforeUnmount(() => clearTimeout(holdTimer));
</script>
