<template>
  <MainLayout>
    <div class="container-fluid">
      <h1>{{ $t("asset.title") }}</h1>
      <router-link to="/asset/create">
        <Button severity="secondary"> Create ASA </Button>
      </router-link>
      <router-link to="/asset/create">
        <Button severity="secondary"> Create NFT </Button>
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
