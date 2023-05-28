<template>
  <div class="container-fluid">
    <div id="nav-tab" class="nav nav-tabs" role="tablist">
      <v-link
        class="nav-item nav-link"
        :class="current == 'overview' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/overview"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
      >
        {{ $t("votemenu.overview") }}
      </v-link>
      <!--
      <v-link
        class="nav-item nav-link"
        :class="current == 'my-questions' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/my-questions"
        role="tab"
        aria-controls="nav-profile"
        aria-selected="false"
        >{{ $t("votemenu.my_questions") }}</v-link
      >-->
      <v-link
        class="nav-item nav-link"
        :class="current == 'ask' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/ask"
        role="tab"
        aria-controls="nav-profile"
        aria-selected="false"
      >
        {{ $t("votemenu.ask_question") }}
      </v-link>
      <v-link
        class="nav-item nav-link"
        :class="current == 'delegate' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/delegate"
        role="tab"
        aria-controls="nav-contact"
        aria-selected="false"
      >
        {{ $t("votemenu.delegation") }}
      </v-link>
      <!--
      <v-link
        class="nav-item nav-link"
        :class="current == 'answers' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/answers"
        role="tab"
        aria-controls="nav-contact"
        aria-selected="false"
        >{{$t("votemenu.answers")}}</v-link
      >-->
      <v-link
        class="nav-item nav-link"
        :class="current == 'tl' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/tl"
        role="tab"
        aria-controls="nav-contact"
        aria-selected="false"
      >
        {{ $t("votemenu.trusted_list") }}
      </v-link>
    </div>
  </div>
</template>

<script>
import VLink from "../components/VLink.vue";
export default {
  components: {
    VLink,
  },
  props: {
    current: String,
  },
};
</script>
