<template>
  <MainLayout minimal>
    <DirectPopup />
  </MainLayout>
</template>

<script lang="ts" setup>
import { watchEffect } from "vue";
import MainLayout from "@/layouts/Main.vue";
import DirectPopup from "@/components/DirectPopup.vue";
import { useStore } from "@/store";
import { parseOriginHint } from "@/scripts/direct/protocol";
import { getWalletBrandName } from "@/scripts/branding";

const store = useStore();
// The popup lives on /direct: after unlocking the wallet it must stay here, not jump to the
// accounts list. This runs while the wallet is still locked (the layout shows Login).
store.dispatch("config/setNoRedirect");

// The window title names the requesting site, so the popup is recognisable in the taskbar.
watchEffect(() => {
  const hint =
    window.opener && window.top === window.self
      ? parseOriginHint(window.location.search)
      : undefined;
  const origin = store.state.direct.popup.dappOrigin ?? hint;
  document.title = origin
    ? `${new URL(origin).host} · ${getWalletBrandName()}`
    : getWalletBrandName();
});
</script>
