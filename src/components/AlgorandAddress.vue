<script setup lang="ts">
import copy from "copy-to-clipboard";
const props = defineProps({
  address: String,
});
</script>
<template>
  <Button
    v-if="props.address?.length == 58"
    v-tooltip="'Address: ' + props.address + ' Tap to copy.'"
    @click="copy(props.address)"
    plain
    text
  >
    {{ props.address.substring(0, 4) }}..{{
      props.address.substring(props.address.length - 4)
    }}
  </Button>
  <div v-else>
    {{ props.address }}
  </div>
</template>
