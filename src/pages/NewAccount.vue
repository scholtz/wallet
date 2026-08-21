<script setup lang="ts">
import MainLayout from "../layouts/Main.vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <MainLayout>
    <h1>
      <span class="page-title-icon"
        ><i class="pi pi-user-plus" aria-hidden="true"
      /></span>
      {{ t("newacc.title") }}
    </h1>
    <TabView>
      <TabPanel
        value="0"
        :header="t('newacc.basic_options')"
        headerClass="mr-2"
      >
        <div class="field grid">
          <RouterLink
            to="/new-account/hd-wallet"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-sitemap mr-2"></i>
              {{ t("newacc.hd_wallet_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.hd_wallet_account_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/ed25519"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-key mr-2"></i>
              {{ t("newacc.create_basic") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.create_basic_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/import-ed25519"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-download mr-2"></i>
              {{ t("newacc.import_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.import_account_help") }}
          </div>
        </div>
      </TabPanel>
      <TabPanel
        value="1"
        :header="t('newacc.advanced_options')"
        headerClass="mr-2"
      >
        <div class="field grid">
          <RouterLink
            to="/new-account/hd-wallet"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-sitemap mr-2"></i>
              {{ t("newacc.hd_wallet_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.hd_wallet_account_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/ed25519"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-key mr-2"></i>
              {{ t("newacc.create_basic") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.create_basic_help") }}
          </div>
        </div>

        <div class="field grid">
          <RouterLink
            to="/new-account/falcon-1024"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-shield mr-2"></i>
              {{ t("newacc.falcon_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.falcon_account_help") }}
          </div>
        </div>

        <div class="field grid">
          <RouterLink
            to="/new-account/ledger"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-microchip mr-2"></i>
              {{ t("newacc.ledger_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.ledger_account_help") }}
          </div>
        </div>

        <div class="field grid">
          <RouterLink to="/new-account/wc" class="col-12 mb-2 md:col-2 md:mb-0">
            <Button class="w-full">
              <i class="pi pi-link mr-2"></i>
              {{ t("newacc.wc_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.wc_account_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/2fa"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-mobile mr-2"></i>
              {{ t("newacc.twofa_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.twofa_account_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/email-password"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-envelope mr-2"></i>
              {{ t("newacc.email_pass_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.email_pass_account_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/vanity"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-sparkles mr-2"></i>
              {{ t("newacc.create_vanity") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.create_vanity_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/multisig"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-users mr-2"></i>
              {{ t("newacc.create_multisign_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.create_multisign_account_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            to="/new-account/watch"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-eye mr-2"></i>
              {{ t("newacc.watch_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.watch_account_help") }}
          </div>
        </div>

        <div class="field grid">
          <RouterLink
            to="/new-account/import-ed25519"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-download mr-2"></i>
              {{ t("newacc.import_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.import_account_help") }}
          </div>
        </div>

        <div class="field grid">
          <RouterLink
            to="/new-account/shamir"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-share-alt mr-2"></i>
              {{ t("newacc.shamir_account") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10">
            {{ t("newacc.shamir_account_help") }}
          </div>
        </div>
      </TabPanel>
    </TabView>
  </MainLayout>
</template>
