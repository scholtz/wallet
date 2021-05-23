<template>
  <footer>
    <a @click="prolong" class="btn btn-xs btn-light float-end">
      {{ t }}
    </a>
    <div v-if="this.$store.state.wallet.isOpen" class="text-center">
      Algo Wallet
    </div>
  </footer>
</template>
<script>
import { mapActions } from "vuex";
import moment from "moment";
export default {
  data() {
    return {
      t: "",
    };
  },
  mounted() {
    setInterval(
      function () {
        this.setTime();
      }.bind(this),
      1000
    );
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      logout: "wallet/logout",
    }),
    setTime() {
      const elapsed = new Date() - this.$store.state.wallet.time;
      const t = 300000 - elapsed;
      if (t < 0) {
        this.logout();
      }
      if (this.$store.state.wallet.isOpen) {
        this.t = moment(t).format("mm:ss");
      } else {
        if (this.t) {
          // unauth
          this.logout();
        }
        this.t = "";
      }
    },
  },
};
</script>
