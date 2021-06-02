<template>
  <PublicLayout>
    <h1>{{ $t("faq.title") }}</h1>
    <Accordion :activeIndex="0">
      <AccordionTab :header="$t('faq.q1')">
        <p>
          {{ $t("faq.a1") }}
        </p> </AccordionTab
      ><AccordionTab :header="$t('faq.q2')">
        <p>
          {{ $t("faq.a2") }}
        </p>
      </AccordionTab>
      <AccordionTab :header="$t('faq.q3')">
        <p>{{ $t("faq.a3") }}</p>
      </AccordionTab>
      <AccordionTab :header="$t('faq.q4')">
        <ol>
          <li>{{ $t("faq.a4_1") }}</li>
          <li>{{ $t("faq.a4_2") }}</li>
          <li>{{ $t("faq.a4_3") }}</li>
          <li>{{ $t("faq.a4_4") }}</li>
        </ol>
      </AccordionTab>
      <AccordionTab :header="$t('faq.q5')">
        <ol>
          <li>{{ $t("faq.a5_1") }}</li>
          <li>{{ $t("faq.a5_2") }}</li>
          <li>{{ $t("faq.a5_3") }}</li>
          <li>
            {{ $t("faq.a5_4") }}
          </li>
          <li>
            {{ $t("faq.a5_5") }}
          </li>
        </ol>
      </AccordionTab>
      <AccordionTab :header="$t('faq.q6')">
        <p>
          {{ $t("faq.a6") }}
        </p>
      </AccordionTab>
      <AccordionTab :header="$t('faq.q7')">
        <ol>
          <li>
            {{ $t("faq.a7_1") }}
          </li>
          <li>
            {{ $t("faq.a7_2") }}
          </li>
          <li>
            {{ $t("faq.a7_3") }}
          </li>
        </ol>
      </AccordionTab>
      <AccordionTab :header="$t('faq.q8')">
        <ol>
          <li>
            {{ $t("faq.a8_1") }}
          </li>
          <li>{{ $t("faq.a8_2") }}</li>
          <li>
            {{ $t("faq.a8_3") }}
          </li>
          <li>
            {{ $t("faq.a8_4") }}
          </li>
        </ol>
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