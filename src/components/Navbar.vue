<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <a v-if="$store.state.config.LOGO" class="navbar-brand" href="/"
        ><img
          :src="$store.state.config.LOGO"
          height="30"
          :alt="$t('navbar.logo')"
        />
      </a>
      <a v-else class="navbar-brand" href="/">{{ $t("navbar.logo") }}</a>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        :aria-label="$t('navbar.toggle_nav')"
      >
        <span class="navbar-toggler-icon" />
      </button>
      <div id="navbarSupportedContent" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li v-if="$store.state.wallet.isOpen" class="nav-item active">
            <v-link class="nav-link" href="/accounts">
              {{ $t("navbar.list_accounts") }}
            </v-link>
          </li>
          <li
            v-if="$store.state.wallet.lastActiveAccountName"
            class="nav-item active"
          >
            <v-link
              class="nav-link"
              :href="'/account/' + $store.state.wallet.lastActiveAccount"
            >
              {{ $store.state.wallet.lastActiveAccountName }}
            </v-link>
          </li>
          <li
            v-if="$store.state.wallet.lastActiveAccountName"
            class="nav-item active"
          >
            <v-link
              class="nav-link"
              :href="'/swap/' + $store.state.wallet.lastActiveAccount"
            >
              {{ $t("navbar.swap") }}
            </v-link>
          </li>
          <li v-if="$store.state.wallet.isOpen" class="nav-item active">
            <v-link class="nav-link" href="/new-account">
              {{ $t("navbar.new_account") }}
            </v-link>
          </li>
          <li v-if="$store.state.wallet.isOpen" class="nav-item active">
            <v-link class="nav-link" href="/asset/create">
              {{ $t("navbar.asset_create") }}
            </v-link>
          </li>
          <li v-if="$store.state.wallet.isOpen" class="nav-item active">
            <v-link class="nav-link" href="/vote/governance/optin">
              {{ $t("navbar.vote") }}
            </v-link>
          </li>
          <li v-if="$store.state.wallet.isOpen" class="nav-item active">
            <v-link class="nav-link" href="/connect#requests">
              {{ $t("navbar.connect") }}
              <span v-if="wcRequestsCount" class="m-1"
                >({{ wcRequestsCount }})</span
              >
            </v-link>
          </li>
          <li class="nav-item active">
            <v-link class="nav-link" href="/payment-gateway">
              {{ $t("merchant.make_payment") }}
            </v-link>
          </li>
          <li class="nav-item active">
            <v-link class="nav-link" href="/faq">
              {{ $t("navbar.faq") }}
            </v-link>
          </li>
          <li class="nav-item active">
            <v-link class="nav-link" href="/privacy-policy">
              {{ $t("navbar.privacy_policy") }}
            </v-link>
          </li>
        </ul>
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
          <Dropdown
            v-if="!$store.state.wallet.isOpen"
            v-model="$i18n.locale"
            :options="$store.state.config.languages"
            style="min-width: 100px"
            @change="languageUpdated"
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
          <li v-if="$store.state.wallet.isOpen" class="nav-item active">
            <v-link class="nav-link" href="/settings">
              <span
                class="badge bg-info text-dark"
                :title="this.$store.state.config.env"
                >{{ this.$store.state.config.envName }}</span
              >
              {{ $t("navbar.settings") }}
            </v-link>
          </li>
          <li v-if="$store.state.wallet.isOpen" class="nav-item active">
            <v-link class="nav-link" href="/" @click="logoutClick">
              {{ $t("navbar.logout") }}
            </v-link>
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
    return {};
  },
  computed: {
    wcRequestsCount() {
      return this.$store.state.wc.requests.length;
    },
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
