<template>
  <div class="container-fluid">
    <div class="nav nav-tabs" id="nav-tab" role="tablist">
      <v-link
        class="nav-item nav-link"
        :class="current == 'gen' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/governance/gen"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
        >{{ $t("govtoolsmenu.gen") }}</v-link
      >
      <v-link
        class="nav-item nav-link"
        :class="current == 'distribute' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/governance/distribute"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
        >{{ $t("govtoolsmenu.distribute") }}</v-link
      >
      <v-link
        class="nav-item nav-link"
        :class="current == 'optin' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/governance/optin"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
        >{{ $t("govtoolsmenu.optin") }}</v-link
      >
      <v-link
        class="nav-item nav-link"
        :class="current == 'pay' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/governance/pay"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
        >{{ $t("govtoolsmenu.pay") }}</v-link
      >
      <!--
      <v-link
        class="nav-item nav-link"
        :class="current == 'merge' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/governance/merge"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
        >{{ $t("govtoolsmenu.merge") }}</v-link
      >-->
    </div>
  </div>
</template>

<script>
import VLink from "./VLink.vue";
export default {
  components: {
    VLink,
  },
  props: {
    current: String,
  },
};
</script>