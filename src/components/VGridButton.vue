<template>
  <RouterLink to="/"><Button severity="secondary">{{ $t("common.go") }}</Button> </RouterLink>
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
