<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <v-link class="navbar-brand" href="/" v-if="$store.state.config.LOGO"
        ><img :src="$store.state.config.LOGO" alt="A Wallet" />
      </v-link>
      <v-link class="navbar-brand" href="/" v-else>A Wallet</v-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/accounts">List my accounts</v-link>
          </li>
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/new-account">New account</v-link>
          </li>
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/settings">Settings</v-link>
          </li>
          <li class="nav-item active">
            <v-link class="nav-link" href="/faq">FAQ</v-link>
          </li>
          <li class="nav-item active">
            <v-link class="nav-link" href="/about">About</v-link>
          </li>
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/" @click="logoutClick"
              >Logout</v-link
            >
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
<script>
import { mapActions } from "vuex";
import VLink from "../components/VLink.vue";
export default {
  components: {
    VLink,
  },
  methods: {
    ...mapActions({
      logout: "wallet/logout",
    }),
    logoutClick() {
      this.logout();
    },
  },
};
</script>