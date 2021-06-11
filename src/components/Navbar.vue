<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <a class="navbar-brand" href="/" v-if="$store.state.config.LOGO"
        ><img
          :src="$store.state.config.LOGO"
          height="30"
          :alt="$t('navbar.logo')"
        />
      </a>
      <a class="navbar-brand" href="/" v-else>{{ $t("navbar.logo") }}</a>

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
          <Dropdown
            v-if="!$store.state.wallet.isOpen"
            v-model="$i18n.locale"
            :options="langs"
            @change="languageUpdated"
            style="min-width: 100px"
          >
            <template #value="slotProps">
              <div v-if="slotProps.value" class="border-dark">
                <img
                  :alt="slotProps.value"
                  class="border-dark"
                  :src="'/flags/3x2/' + slotProps.value + '.svg'"
                  height="15"
                />
                <span class="m-1">{{ slotProps.value }}</span>
              </div>
              <span v-else>
                {{ slotProps.placeholder }}
              </span>
            </template>
            <template #option="slotProps">
              <div class="border-dark">
                <img
                  :alt="slotProps.option"
                  :src="'/flags/3x2/' + slotProps.option + '.svg'"
                  height="15"
                />
                <span class="m-1">{{ slotProps.option }}</span>
              </div>
            </template>
          </Dropdown>
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
      langs: ["en", "sk", "cs","hu"],
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