<template>
  <PublicLayout>
    <h1>{{ $t("404.header") }}</h1>

    <Card>
      <template #content>
        <p>
          {{ $t("404.text") }}
        </p>
      </template>
    </Card>
  </PublicLayout>
</template>

<script lang="ts" setup>
import PublicLayout from "../layouts/Public.vue";
</script>
