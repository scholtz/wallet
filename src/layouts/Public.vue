<template>
  <div class="d-flex flex-column h-100">
    <slot name="header">
      <Navbar />
    </slot>
    <Toast />
    <div class="container-fluid d-flex flex-column flex-grow-1">
      <slot></slot>
    </div>
    <slot name="header">
      <Footer />
    </slot>
  </div>
</template>

<script>
import Toast from "primevue/toast";
import Navbar from "../components/Navbar.vue";
import Footer from "../components/Footer.vue";
import { mapActions } from "vuex";
export default {
  components: {
    Navbar,
    Footer,
    Toast,
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