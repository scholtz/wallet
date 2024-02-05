<template>
  <router-view />
</template>

<script>
import { mapActions } from "vuex";
import { Buffer } from "buffer";
// @ts-ignore
window.Buffer = Buffer;
import wc from "./shared/wc";
import { usePrimeVue } from "primevue/config";

export default {
  name: "App",
  async created() {
    wc.initialize(this.$store);
    await this.getConfig();
  },
  mounted() {
    const PrimeVue = usePrimeVue();
    let lastTheme = localStorage.getItem("lastTheme");
    if (!lastTheme) lastTheme = "lara-dark-teal";
    console.log("last theme", lastTheme);
    PrimeVue.changeTheme("_empty", lastTheme, "theme-link", () => {});
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
