<template>
  <router-link :to="href">
    <slot></slot>
  </router-link>
</template>

<script>
export default {
  props: {
    href: {
      type: String,
      required: true,
    },
  },
};
</script>