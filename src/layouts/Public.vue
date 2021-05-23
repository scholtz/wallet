<template>
  <div class="d-flex flex-column h-100">
    <Navbar />
    <slot></slot>
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