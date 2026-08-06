<template>
  <PublicLayout>
    <div class="success-hero">
      <img
        :src="successImage"
        alt=""
        class="success-hero-image"
        aria-hidden="true"
      />
      <h1>{{ $t("success.payment_successful") }}</h1>
      <p class="success-hero-text">{{ $t("success.thank_you_payment") }}</p>
    </div>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
import successImage from "../assets/img/success-check.svg";
export default {
  components: {
    PublicLayout,
  },
  data() {
    return { successImage };
  },
};
</script>

<style scoped>
.success-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1rem 3rem;
}

.success-hero-image {
  width: 12rem;
  max-width: 60vw;
  height: auto;
  margin-bottom: 1rem;
}

.success-hero-text {
  color: var(--p-text-muted-color);
  font-size: 1.1rem;
  max-width: 32rem;
}
</style>
