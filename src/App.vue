<template>
  <router-view />
</template>

<script>
import { mapActions } from "vuex";
export default {
  name: "App",
  async created() {
    await this.getConfig();
  },
  methods: {
    ...mapActions({
      getConfig: "config/getConfig",
    }),
  },
};
</script>

<style>
th,
td {
  vertical-align: top;
}
</style>