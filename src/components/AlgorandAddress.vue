<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "@/store";
import copy from "copy-to-clipboard";

const props = defineProps<{
  address?: string | null;
}>();

const { t } = useI18n();
const store = useStore();

const shortAddress = computed(() => {
  const addr = props.address ?? "";
  if (addr.length <= 10) return addr;
  return `${addr.substring(0, 4)}..${addr.substring(addr.length - 4)}`;
});

const copyAddress = async () => {
  if (!props.address) return;
  copy(props.address);
  await store.dispatch(
    "toast/openSuccess",
    t("global.address_copied", { address: shortAddress.value })
  );
};
</script>

<template>
  <span class="algorand-address" :title="props.address ?? ''">
    <span class="algorand-address-short">{{ shortAddress }}</span>
    <i
      v-if="props.address"
      class="pi pi-copy algorand-address-copy"
      role="button"
      :title="t('global.copy_address')"
      @click.stop.prevent="copyAddress"
    />
  </span>
</template>

<style scoped>
.algorand-address {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  overflow: hidden;
}

.algorand-address-short {
  white-space: nowrap;
}

.algorand-address-copy {
  cursor: pointer;
  opacity: 0.7;
  flex-shrink: 0;
}

.algorand-address-copy:hover {
  opacity: 1;
}
</style>
