<template>
  <Dialog
    :visible="pending"
    modal
    :closable="false"
    :draggable="false"
    :header="$t('ledger_signing.title')"
    :style="{ width: '28rem', maxWidth: '95vw' }"
    data-testid="ledger-signing-notice"
  >
    <div class="flex flex-column align-items-center gap-3 text-center">
      <ProgressSpinner style="width: 3.5rem; height: 3.5rem" strokeWidth="5" />
      <p class="m-0">{{ $t("ledger_signing.instruction") }}</p>
      <small class="text-color-secondary">
        {{ $t("ledger_signing.waiting") }}
      </small>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/store";

const store = useStore();
const pending = computed(() => store.state.signer.ledgerPending > 0);
</script>
