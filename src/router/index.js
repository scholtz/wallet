import { createWebHistory, createRouter } from "vue-router";
import Home from "@/pages/Home.vue";
import About from "@/pages/About.vue";
import Accounts from "@/pages/Accounts.vue";
import NewAccount from "@/pages/NewAccount.vue";
import NotFound from "@/pages/404.vue";
import FAQ from "@/pages/FAQ.vue";
import Pay from "@/pages/Pay.vue";
import Settings from "@/pages/Settings.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/about",
    name: "About",
    component: About,
  },
  {
    path: "/accounts",
    name: "Accounts",
    component: Accounts,
  },
  {
    path: "/accounts/pay/:account",
    name: "Pay",
    component: Pay,
  },
  {
    path: "/new-account",
    name: "NewAccount",
    component: NewAccount,
  },
  {
    path: "/settings",
    name: "settings",
    component: Settings,
  },
  {
    path: "/faq",
    name: "FAQ",
    component: FAQ,
  },
  {
    path: "/:catchAll(.*)",
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
