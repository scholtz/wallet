<template>
  <router-view />
</template>

<script>
import { mapActions } from "vuex";
import { Buffer } from "buffer";
// @ts-ignore
window.Buffer = Buffer;
import wc from "./shared/wc";

export default {
  name: "App",
  async created() {
    wc.initialize(this.$store);
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
