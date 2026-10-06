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
      <Message
        v-if="directOriginHint"
        severity="info"
        class="m-3" style="overflow-wrap: anywhere"
        data-testid="direct-unlock-banner"
      >
        {{ $t("connect.direct.unlock_banner", { origin: directOriginHint }) }}
      </Message>
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
