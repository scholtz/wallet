<template>
  <section
    class="direct-network-card"
    :class="'direct-network-' + network.kind"
    :aria-label="$t('connect.direct.signing_on')"
    data-testid="direct-network-card"
  >
    <div class="direct-network-label">{{ $t("connect.direct.signing_on") }}</div>
    <div class="direct-network-head">
      <strong class="direct-network-name" data-testid="direct-network">{{
        network.name
      }}</strong>
      <span
        v-if="network.kind === 'test'"
        class="direct-network-badge"
        data-testid="direct-network-test"
        >{{ $t("connect.direct.network_test") }}</span
      >
    </div>
    <Message
      v-if="network.kind === 'unknown'"
      severity="warn"
      class="mt-2"
      data-testid="direct-network-unknown"
    >
      <strong class="block">{{ $t("connect.direct.network_unknown") }}</strong>
      {{ $t("connect.direct.network_unknown_warning") }}
    </Message>
    <div v-if="network.kind === 'unknown'" class="mt-2">
      <div class="direct-network-label">
        {{ $t("connect.direct.genesis_hash_label") }}
      </div>
      <code class="direct-network-hash" data-testid="direct-network-hash">{{
        network.genesisHash
      }}</code>
    </div>
    <small
      v-if="!network.matchesWalletEnv"
      class="direct-network-differs"
      data-testid="direct-network-differs"
    >
      <i class="pi pi-info-circle" aria-hidden="true" />
      {{ $t("connect.direct.network_differs", { selected: selectedName }) }}
    </small>
  </section>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useStore } from "@/store";
import type { DirectNetworkView } from "@/scripts/direct/networks";

defineProps<{ network: DirectNetworkView }>();

const store = useStore();
/** The network selected in the wallet right now (what asset names etc. would come from). */
const selectedName = computed(
  () => store.state.config.envName || store.state.config.env,
);
</script>

<style scoped>
.direct-network-card {
  border: 1px solid var(--p-content-border-color);
  border-left: 4px solid var(--p-text-muted-color);
  border-radius: var(--p-border-radius-md, 6px);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}
.direct-network-test {
  border-left-color: var(--p-blue-500);
}
.direct-network-unknown {
  border-left-color: var(--p-orange-500);
}
.direct-network-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}
.direct-network-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.direct-network-name {
  font-size: 1.35rem;
  line-height: 1.2;
}
.direct-network-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--p-blue-500);
  color: #fff;
}
.direct-network-hash {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  word-break: break-all;
}
.direct-network-differs {
  display: block;
  margin-top: 0.5rem;
  color: var(--p-text-muted-color);
}
</style>
