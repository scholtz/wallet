<template>
  <PublicLayout>
    <div class="container-fluid">
      <h1>{{ $t("asset.title") }}</h1>
      <router-link to="/asset/create" class="btn btn-light"
        >Create ASA</router-link
      >
      <router-link to="/asset/create" class="btn btn-light"
        >Create NFT</router-link
      >
    </div>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
export default {
  components: {
    PublicLayout,
  },
};
</script>