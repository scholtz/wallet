<template>
  <div class="flex flex-column h-full">
    <Navbar2 />
    <Toast />
    <div
      v-if="$store.state.wallet.isOpen"
      class="container-fluid flex flex-column flex-grow-1"
    >
      <slot />
    </div>
    <div v-else class="flex flex-column flex-grow-1">
      <Login />
    </div>
    <Footer />
  </div>
</template>

<script>
import Toast from "primevue/toast";
import Navbar2 from "../components/Navbar2.vue";
import Footer from "../components/Footer.vue";
import Login from "../components/Login.vue";
import { mapActions } from "vuex";
export default {
  components: {
    Navbar2,
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
