<template>
  <PublicLayout>
    <h1>{{ $t("privacy.title") }}</h1>
    <Accordion :active-index="0">
      <AccordionTab :header="$t('privacy.q1')">
        <p>
          {{ $t("privacy.a1") }}
        </p>
      </AccordionTab>
      <AccordionTab :header="$t('privacy.q2')">
        <p>
          {{ $t("privacy.a2") }}
        </p>
      </AccordionTab>
      <AccordionTab :header="$t('privacy.q3')">
        <p>
          {{ $t("privacy.a3") }}
        </p>
      </AccordionTab>
      <AccordionTab :header="$t('privacy.q4')">
        <p>
          {{ $t("privacy.a4") }}
        </p>
      </AccordionTab>
      <AccordionTab :header="$t('privacy.q5')">
        <p>
          {{ $t("privacy.a5") }}
        </p>
      </AccordionTab>
    </Accordion>
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
