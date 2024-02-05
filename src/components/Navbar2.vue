<script setup lang="ts">
import { subscribeToReactNativeNetworkChange } from "@walletconnect/utils";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
const { t, locale } = useI18n();
import { usePrimeVue } from "primevue/config";
const PrimeVue = usePrimeVue();
import { PrimeIcons } from "primevue/api";

const store = useStore();

watch(locale, () => {
  makeMenu();
});

watch(
  store.state.wallet,
  () => {
    makeMenu();
  },
  { deep: true }
);

const makeMenu = () => {
  if (store.state.wallet.isOpen) {
    items.value = [
      {
        label: "Wallet",
        icon: PrimeIcons.HOME,
        items: [
          {
            label: "List accounts",
            icon: PrimeIcons.SERVER,
            route: "/accounts",
          },
          {
            label: t("navbar.new_account"),
            icon: PrimeIcons.PLUS,
            items: [
              {
                label: t("newacc.overview"),
                icon: PrimeIcons.QUESTION,
                route: "/new-account",
              },
              {
                separator: true,
              },
              {
                label: t("newacc.ledger_account"),
                icon: PrimeIcons.LOCK,
                route: "/new-account/ledger",
              },
              {
                label: t("newacc.wc_account"),
                icon: "pi pi-arrows-h",
                route: "/new-account/wc",
              },
              {
                label: t("newacc.twofa_account"),
                icon: PrimeIcons.MOBILE,
                route: "/new-account/2fa",
              },
              {
                label: t("newacc.email_pass_account"),
                icon: PrimeIcons.AT,
                route: "/new-account/email-password",
              },
              {
                label: t("newacc.create_basic"),
                icon: "pi pi-book",
                route: "/new-account/ed25529",
              },
              {
                label: t("newacc.create_vanity"),
                icon: PrimeIcons.FAST_FORWARD,
                route: "/new-account/vanity",
              },
              {
                label: t("newacc.create_multisign_account"),
                icon: PrimeIcons.BUILDING,
                route: "/new-account/multisig",
              },
              {
                label: t("newacc.watch_account"),
                icon: PrimeIcons.EYE,
                route: "/new-account/watch",
              },
              {
                separator: true,
              },
              {
                label: t("newacc.import_account"),
                icon: PrimeIcons.DOWNLOAD,
                route: "/new-account/import-ed25529",
              },
              {
                label: t("newacc.shamir_account"),
                icon: PrimeIcons.CODE,
                route: "/new-account/shamir",
              },
            ],
          },
          {
            separator: true,
          },
          {
            label: t("navbar.logout"),
            icon: "pi pi-times",

            command: async () => {
              await store.dispatch("wallet/logout");
            },
          },
        ],
      },
      {
        label: store.state.wallet.lastActiveAccountName,
        icon: "pi pi-star",
        items: [
          {
            label: "Overview",
            icon: PrimeIcons.LIST,
            route: "/account/" + store.state.wallet.lastActiveAccount,
          },
          {
            separator: true,
          },
          {
            label: t("acc_overview.pay"),
            icon: "pi pi-send",
            route: "/accounts/pay/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("navbar.swap"),
            icon: "pi pi-money-bill",
            route: "/swap/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("acc_overview.rekey"),
            icon: "pi pi-shield",
            route: "/accounts/rekey/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("acc_overview.asset_optin"),
            icon: "pi pi-plus",
            route: "/accounts/optin/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("acc_overview.receive_payment"),
            icon: "pi pi-clone",
            route: "/receive-payment/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("acc_overview.payment_gateway"),
            icon: "pi pi-credit-card",
            route: "/payment-gateway/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("acc_overview.connect"),
            icon: "pi pi-arrows-h",
            route: "/account/connect/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("acc_overview.export"),
            icon: "pi pi-upload",
            route: "/account/export/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: "ARC14",
            icon: "pi pi-unlock",
            route: "/arc14/" + store.state.wallet.lastActiveAccount,
          },
          {
            separator: true,
          },
          {
            label: "Asset manager",
            icon: "pi pi-box",
            items: [
              {
                label: t("navbar.asset_create"),
                icon: "pi pi-plus",
                route: "/asset/create",
              },
            ],
          },
          {
            separator: true,
          },
          {
            label: "Hide/Unhide account",
            icon: "pi pi-eye",
            route: "/account/" + store.state.wallet.lastActiveAccount,
          },
          {
            label: t("acc_overview.delete"),
            icon: "pi pi-trash",
            route: "/account/" + store.state.wallet.lastActiveAccount,
          },
        ],
      },
      {
        label: "Multiaccount ops",
        icon: "pi pi-globe",
        items: [
          {
            label: t("govtoolsmenu.gen"),
            icon: "pi pi-plus",
            route: "/multiaccount/gen",
          },
          {
            label: t("govtoolsmenu.distribute"),
            icon: "pi pi-send",
            route: "/multiaccount/distribute",
          },
          {
            label: t("govtoolsmenu.optin"),
            icon: "pi pi-table",
            route: "/multiaccount/optin",
          },
          {
            label: t("govtoolsmenu.pay"),
            icon: "pi pi-tag",
            route: "/multiaccount/pay",
          },
        ],
      },
      {
        label: t("acc_overview.connect"),
        icon: "pi pi-bolt",
        route: "/account/connect/" + store.state.wallet.lastActiveAccount,
        badge: store.state.wc.requests.length,
      },
      {
        label: store.state.config.env,
        icon: "pi pi-cog",

        items: [
          {
            label: t("navbar.settings"),
            icon: "pi pi-cog",
            route: "/settings",
          },
          {
            label: "Theme",
            icon: "pi pi-palette",
            items: makeThemes(),
          },
          {
            label: "Help",
            icon: "pi pi-question-circle",
            items: [
              {
                label: t("navbar.faq"),
                route: "/faq",
              },
              {
                label: t("navbar.privacy_policy"),
                route: "/privacy-policy",
              },
            ],
          },
        ],
      },
    ];
  } else {
    items.value = [
      {
        label: "Wallet",
        icon: "pi pi-home",
        items: [
          {
            label: "List accounts",
            icon: "pi pi-server",
            route: "/accounts",
          },
        ],
      },
      {
        label: t("merchant.make_payment"),
        icon: "pi pi-credit-card",
        route: "/payment-gateway",
      },
      {
        label: store.state.config.envName,
        icon: "pi pi-question-circle",
        items: [
          {
            label: t("navbar.settings"),
            icon: "pi pi-cog",
            route: "/settings",
          },
          {
            label: "Help",
            icon: "pi pi-question-circle",
            items: [
              {
                label: t("navbar.faq"),
                route: "/faq",
              },
              {
                label: t("navbar.privacy_policy"),
                route: "/privacy-policy",
              },
            ],
          },
        ],
      },
      {
        label: "Theme",
        icon: "pi pi-palette",
        items: makeThemes(),
      },
    ];
  }
};

const items = ref<any>([]);
const makeThemes = () => {
  const allowed = [
    { name: "Lara Dark Teal", file: "lara-dark-teal", icon: "pi pi-moon" },
    { name: "Lara Light Teal", file: "lara-light-teal", icon: "pi pi-sun" },

    { name: "Saga Blue", file: "saga-blue", icon: "pi pi-sun" },
    { name: "Rhea Light", file: "rhea", icon: "pi pi-sun" },
    { name: "Arya Purple", file: "arya-purple", icon: "pi pi-moon" },
    { name: "Nova Alt", file: "nova-alt", icon: "pi pi-sun" },

    { name: "Soho Dark", file: "soho-dark", icon: "pi pi-moon" },
    { name: "Soho Light", file: "soho-light", icon: "pi pi-sun" },

    {
      name: "Bootstrap Dark Purple",
      file: "bootstrap4-dark-purple",
      icon: "pi pi-moon",
    },
    {
      name: "Bootstrap Light Purple",
      file: "bootstrap4-light-purple",
      icon: "pi pi-sun",
    },
  ];

  const ret = [];
  for (const item of allowed) {
    ret.push({
      label: item.name,
      icon: item.icon,
      command: async () => {
        let lastTheme = localStorage.getItem("lastTheme");
        if (!lastTheme) lastTheme = "lara-dark-teal";
        PrimeVue.changeTheme(lastTheme, item.file, "theme-link", () => {});
        localStorage.setItem("lastTheme", item.file);
      },
    });
  }
  return ret;
};
makeMenu();
</script>

<template>
  <div class="card">
    <Menubar :model="items" class="my-2">
      <template #start>
        <RouterLink to="/">
          <svg
            width="110"
            height="20"
            viewBox="0 0 550 113.4"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="h-2rem"
          >
            <polygon
              style="
                font-style: normal;
                font-weight: normal;
                font-size: 117.333px;
                line-height: 1.25;
                font-family: sans-serif;
                letter-spacing: -12px;
                fill: var(--primary-color);
                fill-opacity: 1;
                stroke: none;
              "
              points="36,85 52.4,56.7 68.7,28.3 71.4,23.8 72.6,28.3 77.6,47 72,56.7 55.6,85 39.3,113.4 58.9,113.4 75.3,85 83.8,70.3 87.8,85 95.4,113.4 113,113.4 105.4,85 97.8,56.7 95.8,49.4 108,28.3 90.2,28.3 89.6,26.2 83.4,3 82.6,0 65.5,0 65.1,0.6 49.1,28.3 32.7,56.7 16.4,85 0,113.4 19.6,113.4 "
              id="polygon4"
              transform="translate(16.546299)"
            />
            <text
              xml:space="preserve"
              style="
                font-style: normal;
                font-weight: normal;
                font-size: 117.333px;
                line-height: 1.25;
                font-family: sans-serif;
                letter-spacing: -12px;
                fill: var(--primary-color);
                fill-opacity: 1;
                stroke: none;
              "
              x="116.05807"
              y="113.625"
              id="text15"
            >
              <tspan
                sodipodi:role="line"
                id="tspan13"
                x="116.05807"
                y="113.625"
                style="font-style: italic; font-size: 117.333px"
              >
                WALLET
              </tspan>
            </text>
          </svg>
        </RouterLink>
      </template>
      <template #item="{ item, props, hasSubmenu, root }">
        <RouterLink
          v-if="item.route"
          :to="item.route"
          class="flex align-items-center p-menuitem-link"
        >
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
          <Badge
            v-if="item.badge"
            :class="{ 'ml-auto': !root, 'ml-2': root }"
            :value="item.badge"
          />
          <span
            v-if="item.shortcut"
            class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1"
            >{{ item.shortcut }}</span
          >
          <i
            v-if="hasSubmenu"
            :class="[
              'pi pi-angle-down',
              { 'pi-angle-down ml-2': root, 'pi-angle-right ml-auto': !root },
            ]"
          ></i>
        </RouterLink>

        <a
          v-else
          v-ripple
          class="flex align-items-center"
          v-bind="props.action"
        >
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
          <Badge
            v-if="item.badge"
            :class="{ 'ml-auto': !root, 'ml-2': root }"
            :value="item.badge"
          />
          <span
            v-if="item.shortcut"
            class="ml-auto border-1 surface-border border-round surface-100 text-xs p-1"
            >{{ item.shortcut }}</span
          >
          <i
            v-if="hasSubmenu"
            :class="[
              'pi pi-angle-down',
              { 'pi-angle-down ml-2': root, 'pi-angle-right ml-auto': !root },
            ]"
          ></i>
        </a>
      </template>
    </Menubar>
  </div>
</template>
<style>
.p-submenu-list {
  min-width: 300px;
}
</style>
