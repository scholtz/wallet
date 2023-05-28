<template>
  <RouterLink :to="href">
    <slot />
  </RouterLink>
</template>

<script>
import { RouterLink } from "vue-router";

export default {
  components: [RouterLink],
  props: {
    href: {
      type: String,
      required: true,
    },
  },
};
</script>
