<template>
  <Navbar />
  <div class="container-fluid">
    <slot></slot>
  </div>
</template>

<script>
import Navbar from "../components/Navbar.vue";
export default {
  components: {
    Navbar,
  },
};
</script>
<style>
body {
  margin: 0;
  padding: 0;
}
</style>