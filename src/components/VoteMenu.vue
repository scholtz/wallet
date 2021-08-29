<template>
  <div class="container-fluid">
    <div class="nav nav-tabs" id="nav-tab" role="tablist">
      <v-link
        class="nav-item nav-link"
        :class="current == 'overview' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/overview"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
        >Overview</v-link
      >
      <v-link
        class="nav-item nav-link"
        :class="current == 'my-questions' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/my-questions"
        role="tab"
        aria-controls="nav-profile"
        aria-selected="false"
        >My questions</v-link
      >
      <v-link
        class="nav-item nav-link"
        :class="current == 'ask' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/ask"
        role="tab"
        aria-controls="nav-profile"
        aria-selected="false"
        >Ask question</v-link
      >
      <v-link
        class="nav-item nav-link"
        :class="current == 'delegate' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/delegate"
        role="tab"
        aria-controls="nav-contact"
        aria-selected="false"
        >Delegation</v-link
      >
      <!--
      <v-link
        class="nav-item nav-link"
        :class="current == 'answers' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/answers"
        role="tab"
        aria-controls="nav-contact"
        aria-selected="false"
        >Answers</v-link
      >-->
      <v-link
        class="nav-item nav-link"
        :class="current == 'tl' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/tl"
        role="tab"
        aria-controls="nav-contact"
        aria-selected="false"
        >Trusted list</v-link
      >
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