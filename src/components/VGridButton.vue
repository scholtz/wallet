<template>
  <RouterLink to="/" class="btn btn-light">Go</RouterLink>
</template>
<script>
import { RouterLink } from "vue-router";
export default {
  props: ["rowIndex", "model"],

  components: {
    RouterLink,
  },
};
</script>