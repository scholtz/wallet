<script setup lang="ts">
import localeFlagUrl from "@/scripts/localeFlags";

const props = defineProps<{
  locale: string;
  size?: string;
}>();
</script>
<template>
  <img
    :src="localeFlagUrl(props.locale)"
    :alt="props.locale"
    class="border-round-sm shadow-1"
    :style="{
      height: props.size ?? '1.5rem',
      width: 'auto',
      display: 'inline-block',
      verticalAlign: 'middle',
    }"
  />
</template>
