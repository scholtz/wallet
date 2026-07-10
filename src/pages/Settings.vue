<template>
  <main-layout>
    <h1>{{ $t("settings.title") }}</h1>

    <Card>
      <template #content>
        <h2>{{ $t("settings.server") }}</h2>
        <div class="field grid" v-if="publicList">
          <label for="env2" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("settings.environment") }}
          </label>
          <div class="col-12 md:col-10">
            <Select
              id="env2"
              v-model="env"
              class="w-full"
              :options="publicList"
              optionLabel="name"
              optionValue="network"
            >
            </Select>
          </div>
        </div>
        <div
          class="field grid"
          v-if="algodList && algodList.length > 0 && env != 'custom'"
        >
          <label for="algodProvider" class="col-12 mb-2 md:col-2 md:mb-0">
            Public AlgoD provider
          </label>
          <div class="col-12 md:col-10">
            <Select
              id="algodProvider"
              v-model="algodHost"
              class="w-full"
              :options="algodList"
              optionLabel="providerName"
              optionValue="host"
            >
            </Select>
          </div>
        </div>
        <div class="field grid">
          <label for="algodHost" class="col-12 mb-2 md:col-2 md:mb-0">
            AlgoD {{ $t("settings.host") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText
              id="algodHost"
              v-model="algodHost"
              :disabled="env != 'custom'"
              class="w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="algodToken" class="col-12 mb-2 md:col-2 md:mb-0">
            AlgoD {{ $t("settings.token") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText
              id="algodToken"
              v-model="algodToken"
              :disabled="env != 'custom'"
              class="w-full"
            />
          </div>
        </div>

        <div
          class="field grid"
          v-if="
            participationList && participationList.length > 0 && env != 'custom'
          "
        >
          <label
            for="participationProvider"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            Public participation provider
          </label>
          <div class="col-12 md:col-10">
            <Select
              id="participationProvider"
              v-model="participationHost"
              class="w-full"
              :options="participationList"
              optionLabel="providerName"
              optionValue="host"
            >
            </Select>
          </div>
        </div>
        <div class="field grid">
          <label for="participationHost" class="col-12 mb-2 md:col-2 md:mb-0">
            Participation {{ $t("settings.host") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText
              id="participationHost"
              v-model="participationHost"
              type="text"
              :disabled="env != 'custom'"
              class="w-full"
            />
          </div>
        </div>

        <div
          class="field grid"
          v-if="
            participationList && participationList.length > 0 && env != 'custom'
          "
        >
          <label for="indexerProvider" class="col-12 mb-2 md:col-2 md:mb-0">
            Public Indexer provider
          </label>
          <div class="col-12 md:col-10">
            <Select
              id="indexerProvider"
              v-model="indexerHost"
              class="w-full"
              :options="indexerList"
              optionLabel="providerName"
              optionValue="host"
            >
            </Select>
          </div>
        </div>
        <div class="field grid">
          <label for="indexerHost" class="col-12 mb-2 md:col-2 md:mb-0">
            Indexer {{ $t("settings.host") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText
              id="indexerHost"
              v-model="indexerHost"
              type="text"
              :disabled="env != 'custom'"
              class="w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="indexerToken" class="col-12 mb-2 md:col-2 md:mb-0">
            Indexer {{ $t("settings.token") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText
              id="indexerToken"
              v-model="indexerToken"
              type="text"
              :disabled="env != 'custom'"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <h2>{{ $t("settings.protocol_title") }}</h2>
          <Button @click="registerProtocolClick" severity="secondary">
            {{ $t("settings.protocol_button") }}
          </Button>
        </div>

        <h2>{{ $t("settings.language") }}</h2>

        <Select
          v-model="$i18n.locale"
          :options="$store.state.config.languages"
          style="min-width: 100px"
          @change="languageUpdated"
        >
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex align-items-center">
              <LanguageFlag :locale="slotProps.value" size="1.25rem" />
              <span class="ml-2">{{ slotProps.value }}</span>
            </div>
            <span v-else>
              {{ slotProps.placeholder }}
            </span>
          </template>
          <template #option="slotProps">
            <div class="flex align-items-center">
              <LanguageFlag :locale="slotProps.option" size="1.25rem" />
              <span class="ml-2">{{ slotProps.option }}</span>
            </div>
          </template>
        </Select>
        <h2>{{ $t("settings.pass") }}</h2>
        <form @submit="changePasswordClick">
          <div class="field grid">
            <label for="passw1" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("settings.oldpass") }}
            </label>
            <div class="col-12 md:col-10">
              <Password
                inputId="passw1"
                v-model="passw1"
                inputClass="w-full"
                class="w-full"
                :feedback="false"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="passw2" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("settings.newpass") }}
            </label>
            <div class="col-12 md:col-10">
              <Password
                inputId="passw2"
                v-model="passw2"
                inputClass="w-full"
                class="w-full"
                :feedback="false"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="passw3" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ $t("settings.repeatpass") }}
            </label>
            <div class="col-12 md:col-10">
              <Password
                inputId="passw3"
                v-model="passw3"
                inputClass="w-full"
                class="w-full"
                :feedback="false"
              />
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Button type="submit" severity="secondary">
                {{ $t("settings.update_password") }}
              </Button>
            </div>
          </div>
        </form>
        <h2>{{ $t("settings.dev_settings") }}</h2>
        <div>
          <ToggleSwitch v-model="dev" aria-label="Enable dev output" />
        </div>
        <h2>{{ $t("settings.multiaccount_ops") }}</h2>
        <div>
          <ToggleSwitch
            v-model="multiaccountOps"
            aria-label="Enable multiaccount ops"
          />
        </div>
        <h2>{{ $t("settings.backup") }}</h2>
        <p>{{ $t("settings.backup_help") }}</p>
        <p>
          <Button
            v-if="!b64wallet"
            severity="secondary"
            @click="makeBackupDataClick"
          >
            {{ $t("settings.create_backup") }}
          </Button>
          <a
            v-if="b64wallet"
            :href="'data:image/png;base64,' + b64wallet"
            :download="downloadableWalletName"
            target="_blank"
          >
            <Button>
              {{ $t("settings.download") }}
            </Button>
          </a>
          <Button
            v-if="b64wallet"
            severity="danger"
            class="mx-2"
            @click="destroyWalletClick"
          >
            {{ $t("settings.delete") }}
          </Button>
        </p>
      </template>
    </Card>
  </main-layout>
</template>

<script>
import { mapActions } from "vuex";
import MainLayout from "../layouts/Main.vue";
import { getWalletBrandName } from "@/scripts/branding";

export default {
  components: {
    MainLayout,
  },
  data() {
    return {
      env: "mainnet-v1.0",
      isInitializing: true,
      passw1: "",
      passw2: "",
      passw3: "",
      b64wallet: "",
      algodHost: "",
      algodToken: "",
      participationHost: "",
      participationToken: "",
      indexerHost: "",
      indexerToken: "",
      dev: false,
      multiaccountOps: false,
    };
  },
  computed: {
    envConfig() {
      return this.$store.state.config.env;
    },
    algodHostConfig() {
      return this.$store.state.config.algod;
    },
    algodTokenConfig() {
      return this.$store.state.config.algodToken;
    },
    participationHostConfig() {
      return this.$store.state.config.participation;
    },
    participationTokenConfig() {
      return this.$store.state.config.participationToken;
    },
    indexerHostConfig() {
      return this.$store.state.config.indexer;
    },
    indexerTokenConfig() {
      return this.$store.state.config.indexerToken;
    },
    publicList() {
      return [
        ...this.$store.state.publicData.genesisList,
        { name: "Custom", network: "custom" },
      ];
    },
    algodList() {
      return (this.$store.state.publicData.algodList[this.env] || []).filter(
        (i) => !i.registrationRequired,
      );
    },
    participationList() {
      return (
        this.$store.state.publicData.participationList[this.env] || []
      ).filter((i) => !i.registrationRequired);
    },
    indexerList() {
      return (
        this.$store.state.publicData.indexerList[this.env] || []
      ).filter((i) => !i.registrationRequired);
    },
    downloadableWalletName() {
      return (
        this.$store.state.wallet.name.replace(" ", "") +
        ".algow." +
        new Date().toISOString().slice(0, 10) +
        ".dat"
      );
    },
  },

  watch: {
    async env() {
      if (this.isInitializing) return;
      if (this.env != "custom") {
        await this.setEnv({ env: this.env });
      }
    },
    algodHostConfig() {
      if (this.algodHost != this.algodHostConfig)
        this.algodHost = this.algodHostConfig;
    },
    algodTokenConfig() {
      if (this.algodToken != this.algodTokenConfig)
        this.algodToken = this.algodTokenConfig;
    },
    participationHostConfig() {
      if (this.participationHost != this.participationHostConfig)
        this.participationHost = this.participationHostConfig;
    },
    participationTokenConfig() {
      if (this.participationToken != this.participationTokenConfig)
        this.participationToken = this.participationTokenConfig;
    },
    indexerHostConfig() {
      if (this.indexerHost != this.indexerHostConfig)
        this.indexerHost = this.indexerHostConfig;
    },
    indexerTokenConfig() {
      if (this.indexerToken != this.indexerTokenConfig)
        this.indexerToken = this.indexerTokenConfig;
    },
    algodHost() {
      if (this.algodHost != this.algodHostConfig) this.updateConfig();
    },
    algodToken() {
      if (this.algodToken != this.algodTokenConfig) this.updateConfig();
    },
    participationHost() {
      if (this.participationHost != this.participationHostConfig)
        this.updateConfig();
    },
    participationToken() {
      if (this.participationToken != this.participationTokenConfig)
        this.updateConfig();
    },
    indexerHost() {
      if (this.indexerHost != this.indexerHostConfig) this.updateConfig();
    },
    indexerToken() {
      if (this.indexerToken != this.indexerTokenConfig) this.updateConfig();
    },
    dev() {
      this.setDev({ dev: this.dev });
    },
    multiaccountOps() {
      this.setMultiaccountOps(this.multiaccountOps);
    },
  },
  async mounted() {
    if (this.envConfig) {
      this.env = this.envConfig;
    }
    this.algodHost = this.algodHostConfig;
    this.algodToken = this.algodTokenConfig;
    this.participationHost = this.participationHostConfig;
    this.participationToken = this.participationTokenConfig;
    this.indexerHost = this.indexerHostConfig;
    this.indexerToken = this.indexerTokenConfig;
    this.dev = this.$store.state.config.dev;
    this.multiaccountOps = this.$store.state.config.multiaccountOps;
    await this.getGenesisList();
    if (this.env != "custom") {
      // Only fetches the provider lists for display in the override Selects
      // below - the active network's hosts are resolved by config/setEnv,
      // not here, so re-visiting this page never clobbers a manually picked
      // provider.
      await Promise.all([
        this.getAlgodList({ chainId: this.env }),
        this.getParticipationList({ chainId: this.env }),
        this.getIndexerList({ chainId: this.env }),
      ]);
    }
    this.isInitializing = false;
  },
  methods: {
    ...mapActions({
      setEnv: "config/setEnv",
      setHosts: "config/setHosts",
      setLanguage: "config/setLanguage",
      setDev: "config/setDev",
      setMultiaccountOps: "config/setMultiaccountOps",
      changePassword: "wallet/changePassword",
      backupWallet: "wallet/backupWallet",
      destroyWallet: "wallet/destroyWallet",
      openError: "toast/openError",
      openSuccess: "toast/openSuccess",
      getGenesisList: "publicData/getGenesisList",
      getAlgodList: "publicData/getAlgodList",
      getParticipationList: "publicData/getParticipationList",
      getIndexerList: "publicData/getIndexerList",
    }),
    async changePasswordClick(e) {
      e.preventDefault();
      const result = await this.changePassword({
        passw1: this.passw1,
        passw2: this.passw2,
        passw3: this.passw3,
      });
      if (result) {
        this.openSuccess(this.$t("settings.updated_password"));
      }
    },
    async makeBackupDataClick() {
      this.b64wallet = await this.backupWallet();
    },
    async destroyWalletClick() {
      await this.destroyWallet();
    },
    languageUpdated() {
      this.setLanguage(this.$i18n.locale);
    },
    updateConfig() {
      const publicListItem1 = this.publicList.find(
        (pl) => pl.network == this.env,
      );
      let envName = this.env;
      if (publicListItem1) {
        envName = publicListItem1.name;
      }
      this.setHosts({
        env: this.env,
        envName: envName,
        algod: this.algodHost,
        participation: this.participationHost,
        indexer: this.indexerHost,
        algodToken: this.algodToken,
        participationToken: this.participationToken,
        indexerToken: this.indexerToken,
      });
    },
    registerProtocolClick(e) {
      e.preventDefault();
      try {
        navigator.registerProtocolHandler(
          "web+algorand",
          location.origin + "/pay/%s",
          getWalletBrandName(),
        );
        this.openSuccess(this.$t("settings.protocol_change_success"));
      } catch (exc) {
        this.openError(exc.message);
      }
    },
  },
};
</script>
