<template>
  <MainLayout>
    <VoteTopMenu current="ams01" />
    <VoteMenu current="answers" />
    <h1>Questions</h1>
    <QuestionList />
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import VoteTopMenu from "../../components/VoteTopMenu.vue";
import VoteMenu from "../../components/VoteMenu.vue";
import QuestionList from "./QuestionList";
import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
    VoteTopMenu,
    VoteMenu,
    QuestionList,
  },
  data() {
    return {
      asset: {
        addr: "",
        note: "",
        totalIssuance: 1,
        decimals: 0,
        defaultFrozen: false,
        manager: "",
        reserve: "",
        freeze: "",
        clawback: "",
        unitName: "",
        assetName: "",
        assetURL: "",
        assetMetadataHash: "",
      },
      advanced: false,
    };
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
      openSuccess: "toast/openSuccess",
    }),
  },
};
</script>