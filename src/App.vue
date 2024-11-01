<template>
  <canvas id="gradient-canvas"></canvas>
  <router-view />
</template>

<script>
import { mapActions } from "vuex";
import { Buffer } from "buffer";
// @ts-ignore
window.Buffer = Buffer;

// fix old wallet connect library
// @ts-ignore
window.global ||= window;
// fix new wallet connect library
// @ts-ignore
window.process = {
  env: {},
  version: "",
};
import wc from "./shared/wc";
import { usePrimeVue } from "primevue/config";
import { Gradient } from "whatamesh";

export default {
  name: "App",
  async created() {
    wc.initialize(this.$store);
    await this.getConfig();
  },
  data() {
    return {
      gradient: null,
    };
  },
  mounted() {
    const PrimeVue = usePrimeVue();
    let lastTheme = localStorage.getItem("lastTheme");
    if (!lastTheme) lastTheme = "lara-dark-teal";
    PrimeVue.changeTheme("_empty", lastTheme, "theme-link", () => {});
    PrimeVue.changeTheme("_empty", lastTheme, "theme-link-custom", () => {});
    this.gradient = new Gradient();
    setTimeout(() => {
      this.gradient.initGradient("#gradient-canvas");
    }, 100);
  },
  computed: {
    theme() {
      return this.$store.state.config.theme;
    },
  },
  watch: {
    theme() {
      setTimeout(() => {
        this.gradient.initGradient("#gradient-canvas");
      }, 100);
    },
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
