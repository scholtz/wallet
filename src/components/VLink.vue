<template>
  <a :href="href">
    <slot></slot>
  </a>
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