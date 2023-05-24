<template>
  <RouterLink to="/" class="btn btn-light"> Go </RouterLink>
</template>
<script>
import { RouterLink } from "vue-router";
export default {
  components: {
    RouterLink,
  },
  props: ["rowIndex", "model"],
};
</script>
