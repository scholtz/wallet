<template>
  <PublicLayout>
    <div
      class="flex flex-column lg:flex-row align-items-center gap-5"
    >
      <div class="flex-1">
        <h1>{{ $t("404.header") }}</h1>
        <Card>
          <template #content>
            <p>
              {{ $t("404.text") }}
            </p>
          </template>
        </Card>
      </div>
      <img
        :src="heroImage"
        class="hidden lg:block flex-shrink-0 hero-image-404"
        alt=""
        aria-hidden="true"
      />
    </div>
  </PublicLayout>
</template>

<script lang="ts" setup>
import PublicLayout from "../layouts/Public.vue";
import heroImage from "../assets/img/hero-404.jpg";
</script>

<style scoped>
.hero-image-404 {
  max-width: 24rem;
  border-radius: var(--p-content-border-radius);
  border: 1px solid var(--p-content-border-color);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}
</style>
