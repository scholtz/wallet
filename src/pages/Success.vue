<template>
  <PublicLayout>
    <h1>Payment has been successful</h1>

    <Card>
      <template #content>
        <p>Thank you for your payment</p>
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
