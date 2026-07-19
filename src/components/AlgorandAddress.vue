<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "@/store";
import copy from "copy-to-clipboard";

const props = defineProps<{
  address?: string | null;
  // Opt-in only (default false) so existing call sites keep their current
  // look — enabled explicitly where a link out to a block explorer is
  // actually useful, e.g. the ARC-56 decoded-call argument list.
  linkExplorer?: boolean;
}>();

const explorerUrl = computed(() =>
  props.address ? `https://algorand.scan.biatec.io/address/${props.address}` : ""
);

const { t } = useI18n();
const store = useStore();

// Truncated addresses are trivially spoofable via vanity addresses (audit
// finding AW-2026-004), so the full value must be reachable without hover:
// tapping/clicking the address toggles the full untruncated form, and the
// native title attribute exposes it on hover as well.
const expanded = ref(false);

const shortAddress = computed(() => {
  const addr = props.address ?? "";
  if (addr.length <= 10) return addr;
  return `${addr.substring(0, 4)}..${addr.substring(addr.length - 4)}`;
});

const displayedAddress = computed(() =>
  expanded.value ? props.address ?? "" : shortAddress.value
);

const toggleExpanded = () => {
  if (!props.address || props.address.length <= 10) return;
  expanded.value = !expanded.value;
};

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
  <span
    class="algorand-address"
    :class="{ 'algorand-address-expanded': expanded }"
    :title="props.address ?? ''"
  >
    <span
      class="algorand-address-text"
      role="button"
      tabindex="0"
      @click.stop.prevent="toggleExpanded"
      @keydown.enter.stop.prevent="toggleExpanded"
    >
      {{ displayedAddress }}
    </span>
    <i
      v-if="props.address"
      class="pi pi-copy algorand-address-copy"
      role="button"
      v-tooltip="t('global.copy_address')"
      @click.stop.prevent="copyAddress"
    />
    <a
      v-if="props.address && props.linkExplorer"
      :href="explorerUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="algorand-address-explorer-link"
      v-tooltip="t('global.view_on_explorer')"
      @click.stop
    >
      <i class="pi pi-external-link" />
    </a>
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

.algorand-address-text {
  white-space: nowrap;
  cursor: pointer;
}

.algorand-address-expanded .algorand-address-text {
  white-space: normal;
  word-break: break-all;
}

.algorand-address-copy {
  cursor: pointer;
  opacity: 0.7;
  flex-shrink: 0;
}

.algorand-address-copy:hover {
  opacity: 1;
}

.algorand-address-explorer-link {
  display: inline-flex;
  cursor: pointer;
  opacity: 0.7;
  flex-shrink: 0;
}

.algorand-address-explorer-link:hover {
  opacity: 1;
}
</style>
