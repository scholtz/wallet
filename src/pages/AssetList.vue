<template>
  <MainLayout>
    <div class="container-fluid">
      <h1>{{ $t("asset.title") }}</h1>
      <router-link to="/asset/create" class="btn btn-light">
        Create ASA
      </router-link>
      <router-link to="/asset/create" class="btn btn-light">
        Create NFT
      </router-link>
    </div>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
export default {
  components: {
    MainLayout,
  },
};
</script>
