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
import { getWalletBrandName } from "@/scripts/branding";

const store = useStore();
// The popup lives on /direct: after unlocking the wallet it must stay here, not jump to the
// accounts list. This runs while the wallet is still locked (the layout shows Login).
store.dispatch("config/setNoRedirect");

// The window title names the requesting site once it is verified, so the popup is
// recognisable in the taskbar; before that it shows only the wallet brand.
watchEffect(() => {
  const popup = store.state.direct.popup;
  document.title =
    popup.verified && popup.dappOrigin
      ? `${new URL(popup.dappOrigin).host} · ${getWalletBrandName()}`
      : getWalletBrandName();
});
</script>
