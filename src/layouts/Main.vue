<template>
  <div class="d-flex flex-column h-100">
    <Navbar />
    <div
      v-if="$store.state.wallet.isOpen"
      class="container-fluid d-flex flex-column flex-grow-1"
    >
      <slot></slot>
    </div>
    <div v-else class="d-flex flex-column flex-grow-1">
      <Login />
    </div>
    <Footer />
  </div>
</template>

<script>
import Navbar from "../components/Navbar.vue";
import Footer from "../components/Footer.vue";
import Login from "../components/Login.vue";
export default {
  components: {
    Navbar,
    Login,
    Footer,
  },
};
</script>