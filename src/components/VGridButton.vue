<template>
  <RouterLink to="/"><Button severity="secondary">Go</Button> </RouterLink>
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
