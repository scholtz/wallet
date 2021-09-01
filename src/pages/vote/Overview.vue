<template>
  <MainLayout>
    <VoteMenu current="overview" />
    <h1>{{ $t("voteoverview.title") }}</h1>
    <QuestionList />
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import VoteMenu from "../../components/VoteMenu.vue";
import QuestionList from "./QuestionList";
import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
    VoteMenu,
    QuestionList,
  },
  data() {
    return {};
  },
  computed: {
    accountsWithPrivateKey() {
      return this.$store.state.wallet.privateAccounts.filter((a) => !!a.sk);
    },
    hasPrivate() {
      return (
        this.accountsWithPrivateKey && this.accountsWithPrivateKey.length > 0
      );
    },
  },
  mounted() {
    console.log("accountsWithPrivateKey", this.accountsWithPrivateKey);
  },
  methods: {
    ...mapActions({
      makeAssetCreateTxnWithSuggestedParams:
        "algod/makeAssetCreateTxnWithSuggestedParams",
      openSuccess: "toast/openSuccess",
    }),
  },
};
</script>