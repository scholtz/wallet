<template>
  <footer
    v-if="$store.state.wallet.isOpen"
    class="app-footer-bar my-2"
    :class="{ 'app-footer-minimal': minimal }"
  >
    <div class="flex align-items-center gap-2 px-3 py-2">
      <!-- The translated sentence is rendered through named slots (real elements,
           hardcoded URLs) - never as an HTML string (AW-2026-103). -->
      <p
        v-tooltip.top="versionTooltip"
        class="flex-grow-1 text-center m-0 text-sm footer-text"
      >
        <i18n-t keypath="footer.text" scope="global" tag="span">
          <template #name>{{ brandName }}</template>
          <template #envStatus>{{ envStatus }}</template>
          <template #auditsLink>
            <a :href="AUDITS_URL" target="_blank" rel="noopener noreferrer">{{
              $t("footer.audits_link")
            }}</a>
          </template>
          <template #groupLink>
            <a :href="BIATEC_GROUP_URL" target="_blank" rel="noopener noreferrer">{{
              $t("footer.group_link")
            }}</a>
          </template>
          <template #discordLink>
            <a :href="DISCORD_URL" target="_blank" rel="noopener noreferrer">{{
              $t("footer.discord_link")
            }}</a>
          </template>
        </i18n-t>
        {{ " " + versionLabel }}
      </p>
      <Button
        v-if="t"
        size="small"
        severity="secondary"
        class="footer-timer-btn flex-shrink-0"
        :style="'background:' + b + '; color: black'"
        @click="prolong"
      >
        {{ t }}
      </Button>
    </div>
    <Dialog
      v-model:visible="displayTimeoutDialog"
      :header="$t('footer.session_timeout_header')"
      :modal="true"
      class="m-5"
    >
      <p>
        {{
          $t(
            "footer.session_timeout_message",
            { seconds: timeoutSecondsRemaining },
            timeoutSecondsRemaining
          )
        }}
      </p>
      <template #footer>
        <Button size="small" severity="secondary" @click="logoutNow">
          {{ $t("footer.session_timeout_logout_now") }}
        </Button>
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
import { getWalletBrandName } from "@/scripts/branding";

const SESSION_TIMEOUT_MS = 300000; // 5 minutes
const WARNING_THRESHOLD_MS = 30000; // 30 seconds
const AUDITS_URL = "https://github.com/scholtz/wallet/tree/master/audits/reports";
const BIATEC_GROUP_URL = "https://www.biatec.io";
const DISCORD_URL = "https://discord.gg/gBsts5bPAd";

export default {
  props: {
    /** Popup layouts (Biatec Direct): on phones keep only the session timer, not the brand blurb. */
    minimal: { type: Boolean, default: false },
  },
  data() {
    return {
      t: "",
      b: "white",
      envStatus: "",
      AUDITS_URL,
      BIATEC_GROUP_URL,
      DISCORD_URL,
      displayTimeoutDialog: false,
      timeoutSecondsRemaining: 0,
      timeTimer: null,
    };
  },
  computed: {
    isLocalBuild() {
      return import.meta.env.VITE_BUILD_SOURCE === "local";
    },
    versionLabel() {
      const commit = import.meta.env.VITE_GIT_COMMIT;
      const date = new Date(
        import.meta.env.VITE_BUILD_DATE
      ).toLocaleDateString();
      return this.isLocalBuild
        ? this.$t("footer.version_local", { commit, date })
        : this.$t("footer.version_built", { commit, date });
    },
    versionTooltip() {
      return new Date(import.meta.env.VITE_BUILD_DATE).toLocaleString();
    },
    brandName() {
      return getWalletBrandName();
    },
  },
  mounted() {
    this.setTime();
    this.timeTimer = setInterval(
      function () {
        this.setTime();
      }.bind(this),
      1000
    );
    this.setEnvStatus();
  },
  beforeUnmount() {
    // One timer per footer instance: it must not outlive the component (AW-2026-124).
    clearInterval(this.timeTimer);
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
    logoutNow() {
      this.displayTimeoutDialog = false;
      this.logout();
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
      if (this.displayTimeoutDialog) {
        this.timeoutSecondsRemaining = Math.max(0, Math.ceil(t / 1000));
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
<style scoped>
/* Same glass-chrome treatment as the navbar (.card > .p-menubar in
   Navbar2.vue) — blurred translucent surface, identical border-radius
   token — so the two chrome bars that bookend the page read as one
   consistent system instead of a rounded navbar over a bare-text footer. */
.app-footer-bar {
  backdrop-filter: blur(10px);
  background-color: color-mix(
    in srgb,
    var(--p-content-background) 80%,
    transparent
  );
  border-radius: var(--p-content-border-radius);
}

.footer-text,
.footer-text :deep(a) {
  color: var(--p-text-color);
}
.footer-timer-btn {
  padding: 0.15rem 0.5rem;
  font-size: 0.7rem;
  min-width: 0;
}

/* Direct popup on a phone: the brand blurb costs four lines of a small screen; keep the session
   timer (it is also a tap-to-prolong control) and drop the text. */
@media (max-width: 640px) {
  .app-footer-minimal .footer-text {
    display: none;
  }
  .app-footer-minimal > div {
    justify-content: flex-end;
  }
}
</style>