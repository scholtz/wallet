<template>
  <MainLayout>
    <GenMultiAccounts v-if="$route.params.id == 'gen'" />
    <MergeAccounts v-if="$route.params.id == 'merge'" />
    <OptInGovernance v-if="$route.params.id == 'optin'" />
    <PayFromMultipleAccounts v-if="$route.params.id == 'pay'" />
    <PayToMultipleAccounts v-if="$route.params.id == 'distribute'" />
  </MainLayout>
</template>

<script>
import MainLayout from "../../layouts/Main.vue";
import GenMultiAccounts from "../../components/tools/GenMultiAccounts.vue";
import MergeAccounts from "../../components/tools/MergeAccounts.vue";
import OptInGovernance from "../../components/tools/OptInGovernance.vue";
import PayFromMultipleAccounts from "../../components/tools/PayFromMultipleAccounts.vue";
import PayToMultipleAccounts from "../../components/tools/PayToMultipleAccounts.vue";
import { mapActions } from "vuex";
export default {
  components: {
    MainLayout,
    GenMultiAccounts,
    MergeAccounts,
    OptInGovernance,
    PayFromMultipleAccounts,
    PayToMultipleAccounts,
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
  methods: {
    ...mapActions({
      openSuccess: "toast/openSuccess",
    }),
  },
};
</script>
