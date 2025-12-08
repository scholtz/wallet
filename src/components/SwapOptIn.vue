<template>
  <div v-if="requiresOptIn">
    <h2>{{ $t("swap.apps_optin") }}</h2>
    <ul>
      <li v-for="app in appsToOptIn" :key="app">
        {{ app }}
      </li>
    </ul>
    <Button class="my-2" :disabled="processingOptin" @click="$emit('opt-in')">
      <ProgressSpinner
        v-if="processingOptin"
        style="width: 1em; height: 1em"
        strokeWidth="5"
      />
      {{ $t("swap.apps_optin_button") }}
    </Button>
  </div>
</template>

<script>
export default {
  name: "SwapOptIn",
  props: {
    requiresOptIn: Boolean,
    appsToOptIn: Array,
    processingOptin: Boolean,
  },
  emits: ["opt-in"],
};
</script>
