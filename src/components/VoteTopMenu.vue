<template>
  <div class="container-fluid">
    <div id="nav-tab" class="nav nav-tabs" role="tablist">
      <v-link
        class="nav-item nav-link"
        :class="current == 'governance' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/governance/optin"
        role="tab"
        aria-controls="nav-home"
        aria-selected="true"
      >
        {{ $t("votemenu.governance") }}
      </v-link>
      <v-link
        class="nav-item nav-link"
        :class="current == 'ams01' ? 'active' : ''"
        data-toggle="tab"
        href="/vote/overview"
        role="tab"
        aria-controls="nav-profile"
        aria-selected="false"
      >
        {{ $t("votemenu.ams01") }}
      </v-link>
    </div>
    <div v-if="current == 'governance'">
      <h1>Algorand foundation governance</h1>
      <p>
        You can find here set of tools to allow algorand governance management.
        Disclaimer: this is not an official algorand foundation website. This is
        community project that seeks to help better manage governance. Always
        check transactions which it creates.
      </p>
    </div>
    <div v-if="current == 'ams01'">
      <h1>Knowledge based pure democracy voting system</h1>
      <p>
        Knowledge based pure democracy voting system based on Algorand Message
        Standard 1 (<a
          href="https://scholtz.github.io/AMS/AMS-0001/AMS-0001.html"
          target="_blang"
          rel="noreferrer"
          >AMS-0001</a
        >) is set of note field schemas and rules for vote calculation. AWallet
        has implemented this standard as the demo for usage on mainnet, testnet
        or sandbox.
        <a href="https://www.vote-coin.com" target="_blang" rel="noreferrer"
          >Vote Coin</a
        >
        is governance token for this specification and provides auditing
        services.
      </p>
      <Button
        v-for="token in voteTokens"
        :key="token.assetId"
        class="m-2"
        :severity="currentToken == token.assetId ? 'primary' : 'secondary'"
        @click="
          setToken({ assetId: token.assetId });
          showCustom = false;
          customToken = token.assetId;
        "
        >{{ token.name }}
      </Button>
      <Button
        class="m-2"
        :severity="showCustom ? 'primary' : 'secondary'"
        @click="showCustom = true"
        >Custom token
      </Button>

      <InputText
        v-if="showCustom"
        v-model="customToken"
        class="w-full m-2"
        @change="setToken({ assetId: customToken })"
      />
    </div>
  </div>
</template>

<script>
import VLink from "./VLink.vue";
import { mapActions } from "vuex";
export default {
  components: {
    VLink,
  },
  props: {
    current: String,
  },
  data() {
    return { showCustom: false, customToken: 0 };
  },
  computed: {
    env() {
      return this.$store.state.config.env;
    },
    currentToken() {
      return this.$store.state.vote.assetId;
    },
    voteTokens() {
      return this.$store.state.vote.voteTokens.filter(
        (vt) => vt.env == this.env
      );
    },
  },
  mounted() {
    this.customToken = localStorage.getItem("voteToken");
    this.setToken({ assetId: this.customToken });
    if (!this.voteTokens.find((t) => t.assetId == this.customToken))
      this.showCustom = true;
  },
  methods: {
    ...mapActions({
      setToken: "vote/setToken",
    }),
  },
};
</script>
