<script setup lang="ts">
import { ref } from "vue";
import TabMenu from "primevue/tabmenu";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { RootState } from "@/store";

const store = useStore<RootState>();
const route = useRoute();
const { t } = useI18n();

const currentAccount = store.state.wallet.privateAccounts.find(
  (a) => a.addr === route?.params?.account
);

const items = ref([
  {
    label: store.state.wallet.lastActiveAccountName,
    icon: "pi pi-home",
    route: "/account/" + route?.params?.account,
  },
  {
    label: t("acc_overview.actions"),
    icon: "pi pi-bolt",
    route: "/account/actions/" + route?.params?.account,
  },
  {
    label: t("acc_overview.assets"),
    icon: "pi pi-money-bill",
    route: "/account/assets/" + route?.params?.account,
  },
  {
    label: t("acc_overview.transactions"),
    icon: "pi pi-list",
    route: "/account/txs/" + route?.params?.account,
  },
  ...(currentAccount?.type === "hd"
    ? [
        {
          label: t("acc_overview.generate_next_hd"),
          icon: "pi pi-sitemap",
          route: "/account/hd-next/" + route?.params?.account,
        },
      ]
    : []),
]);
let activeDefault = 0;
for (const index in items.value) {
  if (items.value[index].route == route.fullPath) {
    activeDefault = parseInt(index);
  }
}

const active = ref(activeDefault);
</script>

<template>
  <div class="account-top-menu">
    <TabMenu :model="items" v-model:activeIndex="active">
      <template #item="{ item, props }">
        <router-link
          v-if="item.route"
          v-slot="{ href, navigate }"
          :to="item.route"
          custom
        >
          <a v-ripple :href="href" v-bind="props.action" @click="navigate">
            <span v-bind="props.icon" />
            <span v-bind="props.label">{{ item.label }}</span>
          </a>
        </router-link>
        <a
          v-else
          v-ripple
          :href="item.url"
          :target="item.target"
          v-bind="props.action"
        >
          <span v-bind="props.icon" />
          <span v-bind="props.label">{{ item.label }}</span>
        </a>
      </template>
    </TabMenu>
  </div>
</template>

<style>
/* Segmented-control look instead of the bare underline-tab default: a
   floating pill bar with a solid background fill on the active tab, more in
   line with the rest of the app's card-elevated chrome. */
.account-top-menu {
  margin-bottom: 1rem;
}

.account-top-menu .p-tabmenu-tablist {
  gap: 0.25rem;
  padding: 0.35rem;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.account-top-menu .p-tabmenu-item-link {
  border: none;
  border-radius: calc(var(--p-content-border-radius) - 2px);
  font-weight: 500;
}

.account-top-menu .p-tabmenu-item-active .p-tabmenu-item-link {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  font-weight: 600;
}

.account-top-menu .p-tabmenu-item-active .p-tabmenu-item-icon {
  color: var(--p-primary-contrast-color);
}
</style>
