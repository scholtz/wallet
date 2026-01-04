<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { useStore } from "vuex";
const store = useStore<RootState>();
import AccountTopMenu from "../../components/AccountTopMenu.vue";
import { RootState } from "@/store";
import { useI18n } from "vue-i18n";
const { t } = useI18n(); // use as global scope
</script>

<template>
  <MainLayout>
    <AccountTopMenu />
    <Card>
      <template #content>
        <div class="field grid">
          <RouterLink
            :to="'/accounts/pay/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-send mr-2"></i>
              {{ t("acc_overview.pay") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.pay_help") }}
          </div>
        </div>

        <div class="field grid">
          <RouterLink
            :to="
              '/accounts/scheduled-payment/' +
              store.state.wallet.lastActiveAccount
            "
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-replay mr-2"></i>
              {{ t("acc_overview.scheduled_payment") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.scheduled_payment_help") }}
          </div>
        </div>

        <div class="field grid">
          <RouterLink
            :to="'/swap/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-money-bill mr-2"></i>
              {{ t("navbar.swap") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.swap_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            :to="'/accounts/rekey/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-shield mr-2"></i>
              {{ t("acc_overview.rekey") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.rekey_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            :to="'/account/optin/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-plus mr-2"></i>
              {{ t("acc_overview.asset_optin") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.asset_optin_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            :to="'/account/optinArc200/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-plus mr-2"></i>
              {{ t("acc_overview.asset_optinArc200") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.asset_optinArc200_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            :to="'/receive-payment/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-clone mr-2"></i>
              {{ t("acc_overview.receive_payment") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.receive_payment_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            :to="'/account/export/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-upload mr-2"></i>
              {{ t("acc_overview.export") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.export_help") }}
          </div>
        </div>
        <div class="field grid">
          <RouterLink
            :to="'/arc14/' + store.state.wallet.lastActiveAccount"
            class="col-12 mb-2 md:col-2 md:mb-0"
          >
            <Button class="w-full">
              <i class="pi pi-unlock mr-2"></i>
              {{ t("acc_overview.arc14") }}
            </Button>
          </RouterLink>
          <div class="col-12 md:col-10 h-full vertical-align-middle">
            {{ t("acc_overview.arc14_help") }}
          </div>
        </div></template
      >
    </Card>
  </MainLayout>
</template>
