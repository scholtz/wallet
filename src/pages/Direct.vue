<template>
  <MainLayout minimal>
    <DirectPopup />
  </MainLayout>
</template>

<script lang="ts" setup>
import MainLayout from "@/layouts/Main.vue";
import DirectPopup from "@/components/DirectPopup.vue";
import { useStore } from "@/store";

// The popup lives on /direct: after unlocking the wallet it must stay here, not jump to the
// accounts list. This runs while the wallet is still locked (the layout shows Login).
useStore().dispatch("config/setNoRedirect");
</script>
