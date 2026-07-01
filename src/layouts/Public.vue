<template>
  <div class="flex flex-column h-full">
    <slot name="header">
      <Navbar />
    </slot>
    <Toast />
    <div
      class="flex flex-column flex-grow-1"
      :class="{ 'page-shell': !noShell }"
    >
      <slot />
    </div>
    <slot name="footer">
      <Footer />
    </slot>
  </div>
</template>

<script>
import Toast from "primevue/toast";
import Navbar from "../components/Navbar2.vue";
import Footer from "../components/Footer.vue";
import { mapActions } from "vuex";
export default {
  components: {
    Navbar,
    Footer,
    Toast,
  },
  props: {
    // Centered-auth-form pages (new/import wallet) manage their own
    // Panel and want the transparent gradient behind it, matching
    // Login.vue's "open wallet" screen — same pattern, opted out of the
    // shared opaque .page-shell that most other pages get.
    noShell: {
      type: Boolean,
      default: false,
    },
  },
  created() {
    this.setVM({ _vm: this });
  },
  mounted() {
    this.setVM({ _vm: this });
  },
  methods: {
    ...mapActions({
      setVM: "toast/setVM",
    }),
  },
};
</script>
