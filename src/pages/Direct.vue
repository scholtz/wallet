<template>
  <MainLayout minimal>
    <DirectPopup />
  </MainLayout>
</template>

<script lang="ts" setup>
import { watch, watchEffect } from "vue";
import MainLayout from "@/layouts/Main.vue";
import DirectPopup from "@/components/DirectPopup.vue";
import { useStore } from "@/store";
import { getWalletBrandName } from "@/scripts/branding";
import { enlargedPopupGeometry } from "@/scripts/direct/windowSize";

const store = useStore();
// The popup lives on /direct: after unlocking the wallet it must stay here, not jump to the
// accounts list. This runs while the wallet is still locked (the layout shows Login).
store.dispatch("config/setNoRedirect");

// dApps on an older adapter open this popup at 480x720. Enlarge such a window (allowed for
// windows a script opened); best effort, a refusal by the browser changes nothing. Only done
// once the opener's origin is verified, so an arbitrary page that opens /direct cannot make
// the wallet move or resize its window (AW-2026-070).
let resized = false;
const enlargeOnce = () => {
  if (resized) return;
  resized = true;
  if (!window.opener || window.top !== window.self) return;
  const geometry = enlargedPopupGeometry(
    {
      width: window.screen.availWidth,
      height: window.screen.availHeight,
      // availLeft/availTop exist in Chromium and Firefox; absent means a single screen at 0,0.
      left: (window.screen as Screen & { availLeft?: number }).availLeft ?? 0,
      top: (window.screen as Screen & { availTop?: number }).availTop ?? 0,
    },
    { width: window.outerWidth, height: window.outerHeight },
  );
  if (!geometry) return;
  try {
    window.resizeTo(geometry.width, geometry.height);
    window.moveTo(geometry.left, geometry.top);
  } catch {
    // The browser refused (not a script-opened window): keep the current size.
  }
};
watch(
  () => store.state.direct.popup.verified,
  (verified) => {
    if (verified) enlargeOnce();
  },
  { immediate: true },
);

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
