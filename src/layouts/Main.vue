<template>
  <div class="d-flex flex-column h-100">
    <Navbar />
    <Toast />
    <div
      v-if="$store.state.wallet.isOpen"
      class="container-fluid d-flex flex-column flex-grow-1"
    >
      <slot />
    </div>
    <div v-else class="d-flex flex-column flex-grow-1">
      <Login />
    </div>
    <Footer />
  </div>
</template>

<script>
import Toast from "primevue/toast";
import Navbar from "../components/Navbar.vue";
import Footer from "../components/Footer.vue";
import Login from "../components/Login.vue";
import { mapActions } from "vuex";
export default {
  components: {
    Navbar,
    Login,
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
