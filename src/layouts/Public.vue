<template>
  <div class="d-flex flex-column h-100">
    <Navbar />
    <div class="container-fluid d-flex flex-column flex-grow-1">
      <slot></slot>
    </div>
    <Footer />
  </div>
</template>

<script>
import Navbar from "../components/Navbar.vue";
import Footer from "../components/Footer.vue";
export default {
  components: {
    Navbar,
    Footer,
  },
};
</script>