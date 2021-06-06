<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <v-link class="navbar-brand" href="/" v-if="$store.state.config.LOGO"
        ><img
          :src="$store.state.config.LOGO"
          height="30"
          :alt="$t('navbar.logo')"
        />
      </v-link>
      <v-link class="navbar-brand" href="/" v-else>{{
        $t("navbar.logo")
      }}</v-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        :aria-label="$t('navbar.toggle_nav')"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/accounts">{{
              $t("navbar.list_accounts")
            }}</v-link>
          </li>
          <li
            class="nav-item active"
            v-if="$store.state.wallet.lastActiveAccountName"
          >
            <v-link
              class="nav-link"
              :href="'/account/' + $store.state.wallet.lastActiveAccount"
              >{{ $store.state.wallet.lastActiveAccountName }}</v-link
            >
          </li>
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/new-account">{{
              $t("navbar.new_account")
            }}</v-link>
          </li>
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/asset/create">{{
              $t("navbar.asset_create")
            }}</v-link>
          </li>
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/settings">{{
              $t("navbar.settings")
            }}</v-link>
          </li>
          <li class="nav-item active">
            <v-link class="nav-link" href="/faq">{{ $t("navbar.faq") }}</v-link>
          </li>
          <li class="nav-item active">
            <v-link class="nav-link" href="/privacy-policy">{{
              $t("navbar.privacy_policy")
            }}</v-link>
          </li>
          <select class="" v-model="$i18n.locale" @change="languageUpdated">
            <option v-for="(lang, i) in langs" :key="`Lang${i}`" :value="lang">
              {{ lang }}
            </option>
          </select>
          <li class="nav-item active" v-if="$store.state.wallet.isOpen">
            <v-link class="nav-link" href="/" @click="logoutClick">{{
              $t("navbar.logout")
            }}</v-link>
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
  data() {
    return {
      langs: ["en", "sk", "cs"],
    };
  },
  methods: {
    ...mapActions({
      logout: "wallet/logout",
    }),
    logoutClick() {
      this.logout();
    },
    languageUpdated() {
      localStorage.setItem("lang", this.$i18n.locale);
    },
  },
};
</script>