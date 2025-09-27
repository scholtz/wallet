<template>
  <PublicLayout>
    <h1>{{ $t("success.payment_successful") }}</h1>

    <Card>
      <template #content>
        <p>{{ $t("success.thank_you_payment") }}</p>
      </template>
    </Card>
  </PublicLayout>
</template>

<script>
import PublicLayout from "../layouts/Public.vue";
export default {
  components: {
    PublicLayout,
  },
};
</script>
