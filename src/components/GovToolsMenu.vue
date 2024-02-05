<template>
  <div id="nav-tab" class="nav nav-tabs" role="tablist">
    <v-link
      class="nav-item nav-link"
      :class="current == 'gen' ? 'active' : ''"
      data-toggle="tab"
      href="/multiaccount/gen"
      role="tab"
      aria-controls="nav-home"
      aria-selected="true"
    >
      {{ $t("govtoolsmenu.gen") }}
    </v-link>
    <v-link
      class="nav-item nav-link"
      :class="current == 'distribute' ? 'active' : ''"
      data-toggle="tab"
      href="/multiaccount/distribute"
      role="tab"
      aria-controls="nav-home"
      aria-selected="true"
    >
      {{ $t("govtoolsmenu.distribute") }}
    </v-link>
    <v-link
      class="nav-item nav-link"
      :class="current == 'optin' ? 'active' : ''"
      data-toggle="tab"
      href="/multiaccount/optin"
      role="tab"
      aria-controls="nav-home"
      aria-selected="true"
    >
      {{ $t("govtoolsmenu.optin") }}
    </v-link>
    <v-link
      class="nav-item nav-link"
      :class="current == 'pay' ? 'active' : ''"
      data-toggle="tab"
      href="/multiaccount/pay"
      role="tab"
      aria-controls="nav-home"
      aria-selected="true"
    >
      {{ $t("govtoolsmenu.pay") }}
    </v-link>
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
