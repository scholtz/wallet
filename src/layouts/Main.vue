<template>
  <div class="flex flex-column h-full">
    <Navbar2 v-if="!minimal" />
    <Toast />
    <div
      v-if="$store.state.wallet.isOpen"
      class="container-fluid flex flex-column flex-grow-1 page-shell"
    >
      <slot />
    </div>
    <div v-else class="flex flex-column flex-grow-1">
      <section
        v-if="directOriginHint"
        class="direct-unlock-banner"
        role="note"
        data-testid="direct-unlock-banner"
      >
        <span class="direct-unlock-icon" aria-hidden="true">
          <i class="pi pi-shield" />
        </span>
        <div class="direct-unlock-body">
          <div class="direct-unlock-title">
            {{ $t("connect.direct.unlock_title") }}
          </div>
          <div class="direct-unlock-origin">
            <span class="direct-unlock-scheme">{{ directOriginParts.scheme }}</span
            ><strong>{{ directOriginParts.host }}</strong>
          </div>
          <div class="direct-unlock-note">
            {{ $t("connect.direct.unlock_note") }}
          </div>
        </div>
      </section>
      <Login />
    </div>
    <Footer v-if="$store.state.wallet.isOpen" />
  </div>
</template>

<script>
import Toast from "primevue/toast";
import Navbar2 from "../components/Navbar2.vue";
import Footer from "../components/Footer.vue";
import Login from "../components/Login.vue";
import { mapActions } from "vuex";
import { parseOriginHint } from "../scripts/direct/protocol";
export default {
  props: {
    /** Popup mode (Biatec Direct): no navbar, the Footer (auto-lock timer) stays. */
    minimal: { type: Boolean, default: false },
  },
  components: {
    Navbar2,
    Login,
    Footer,
    Toast,
  },
  computed: {
    /** Biatec Direct popup, wallet still locked: the site asking for access (from the URL hint). */
    /** Scheme and host of the hint, shown separately so the host stands out. */
    directOriginParts() {
      try {
        const url = new URL(this.directOriginHint);
        return { scheme: `${url.protocol}//`, host: url.host };
      } catch {
        return { scheme: "", host: this.directOriginHint };
      }
    },
    directOriginHint() {
      if (!this.minimal || this.$route?.path !== "/direct") return undefined;
      // Only a real popup (has an opener, not framed): a plain link or iframe is not a request.
      if (!window.opener || window.top !== window.self) return undefined;
      return parseOriginHint(window.location.search);
    },
  },
  created() {
    this.setVM({ _vm: this });
  },
  mounted() {
    this.setVM({ _vm: this });
  },
  methods: {
    ...mapActions({
      setVM: "toast/setVM",
    }),
  },
};
</script>

<style scoped>
/* Solid card on the gradient: theme tokens keep text readable in light and dark mode. */
.direct-unlock-banner {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  width: min(100% - 2rem, 680px);
  margin: 1.5rem auto 0;
  padding: 1.1rem 1.25rem;
  background: var(--p-content-background);
  color: var(--p-text-color);
  border: 1px solid var(--p-content-border-color);
  border-left: 5px solid var(--p-primary-color);
  border-radius: var(--p-content-border-radius, 8px);
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.22);
}
.direct-unlock-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  font-size: 1.2rem;
}
.direct-unlock-body {
  min-width: 0;
}
.direct-unlock-title {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}
.direct-unlock-origin {
  margin: 0.2rem 0 0.4rem;
  font-size: 1.35rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.direct-unlock-scheme {
  color: var(--p-text-muted-color);
}
.direct-unlock-note {
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--p-text-color);
}
</style>
