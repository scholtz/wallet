<template>
  <div class="container-fluid">
    <Navbar />
    <div v-if="$store.state.wallet.isOpen">
      <slot></slot>
    </div>
    <div v-else><login /></div>
  </div>
</template>

<script>
import Navbar from "../components/Navbar.vue";
import Login from "../components/Login.vue";
export default {
  components: {
    Navbar,
    Login,
  },
};
</script>
<style>
body {
  margin: 0;
  padding: 0;
}
</style>