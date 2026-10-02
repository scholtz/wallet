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
import { computed, ref, watch } from "vue";
import { useStore } from "@/store";

const store = useStore();
const pending = computed(() => store.state.signer.ledgerPendingIds.length > 0);
const dismissed = ref(false);
const visible = computed(() => pending.value && !dismissed.value);

// A newly started signing request (including the next one of a SignAll batch)
// shows the notice again; hiding only applies to what is pending right now.
watch(
  () => store.state.signer.ledgerPendingIds.length,
  (count, previous) => {
    if (count === 0 || count > previous) dismissed.value = false;
  },
);
</script>
