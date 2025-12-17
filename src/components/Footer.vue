<template>
  <footer v-if="$store.state.wallet.isOpen" class="my-4">
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
    <Dialog
      v-model:visible="displayTimeoutDialog"
      :header="$t('footer.session_timeout_header')"
      :modal="true"
      class="m-5"
    >
      <p>{{ $t("footer.session_timeout_message") }}</p>
      <template #footer>
        <Button size="small" @click="continueSession">
          {{ $t("footer.session_timeout_continue") }}
        </Button>
      </template>
    </Dialog>
  </footer>
</template>
<script>
import { mapActions } from "vuex";
import moment from "moment";

const SESSION_TIMEOUT_MS = 300000; // 5 minutes
const WARNING_THRESHOLD_MS = 30000; // 30 seconds

export default {
  data() {
    return {
      t: "",
      b: "white",
      envStatus: "",
      displayTimeoutDialog: false,
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
    async continueSession() {
      try {
        await this.prolong();
        this.displayTimeoutDialog = false;
      } catch (error) {
        console.error("Failed to prolong session:", error);
        // Keep dialog open if prolong fails
      }
    },
    setTime() {
      const elapsed = new Date() - this.$store.state.wallet.time;
      const t = SESSION_TIMEOUT_MS - elapsed;
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
      // Show dialog at warning threshold
      if (t <= WARNING_THRESHOLD_MS && t > 0 && !this.displayTimeoutDialog) {
        this.displayTimeoutDialog = true;
      }
      if (t < 0) {
        this.displayTimeoutDialog = false;
        this.logout();
      }
      if (this.$store.state.wallet.isOpen) {
        this.t = moment(t).format("mm:ss");
      } else {
        if (this.t) {
          // unauth
          this.displayTimeoutDialog = false;
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
