<template>
  <footer v-if="$store.state.wallet.isOpen">
    <div class="grid">
      <div class="col" />
      <div class="col">
        <p class="text-center m-0">
          {{ $t("footer.text") + envStatus }}
        </p>
      </div>
      <div class="col align-content-end text-right">
        <Button
          v-if="t"
          size="small"
          severity="secondary"
          :style="'background:' + b + '; color: black'"
          @click="prolong"
        >
          {{ t }}
        </Button>
      </div>
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
      b: "white",
      envStatus: "",
    };
  },
  mounted() {
    this.setTime();
    setInterval(
      function () {
        this.setTime();
      }.bind(this),
      1000
    );
    this.setEnvStatus();
  },
  methods: {
    ...mapActions({
      prolong: "wallet/prolong",
      logout: "wallet/logout",
    }),
    setTime() {
      const elapsed = new Date() - this.$store.state.wallet.time;
      const t = 300000 - elapsed;
      if (t < 60000) {
        const sec = Math.round(t / 1000) % 3;
        if (sec == 0) {
          this.b = "white";
        }
        if (sec == 1) {
          this.b = "red";
        }
        if (sec == 2) {
          this.b = "orange";
        }
      } else {
        this.b = "white";
      }
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
    setEnvStatus() {
      const configStatus = this.$store.state.config.env;
      switch (configStatus) {
        case "mainnet":
          return;
        case "aramidmain":
          this.envStatus = " on Aramid Mainnet";
          return;
        case "testnet":
          this.envStatus = " on Testnet";
          return;
        case "devnet":
          this.envStatus = " on Devnet";
          return;
        case "sandbox":
          this.envStatus = " on Sandbox";
          return;
        default:
          break;
      }
    },
  },
};
</script>
