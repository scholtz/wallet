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
  <div class="card">
    <TabMenu :model="items" v-model:activeIndex="active">
      <template #item="{ item, props }">
        <router-link
          v-if="item.route"
          v-slot="{ href, navigate }"
          :to="item.route"
          custom
        >
          <a
            v-ripple
            :href="href"
            v-bind="props.action"
            @click="navigate"
            class="mx-1"
          >
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
          class="mx-1"
        >
          <span v-bind="props.icon" />
          <span v-bind="props.label">{{ item.label }}</span>
        </a>
      </template>
    </TabMenu>
  </div>
</template>
