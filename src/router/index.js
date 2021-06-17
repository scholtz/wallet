import { createWebHistory, createRouter } from "vue-router";
import Privacy from "@/pages/Privacy.vue";
import ImportWallet from "@/pages/ImportWallet.vue";
import Accounts from "@/pages/Accounts.vue";
import AccountOverview from "@/pages/AccountOverview.vue";
import TransactionDetail from "@/pages/TransactionDetail.vue";
import NewAccount from "@/pages/NewAccount.vue";
import NotFound from "@/pages/404.vue";
import FAQ from "@/pages/FAQ.vue";
import Pay from "@/pages/Pay.vue";
import ReceivePayment from "@/pages/ReceivePayment.vue";
import Settings from "@/pages/Settings.vue";
import Asset from "@/pages/AssetList.vue";
import AssetCreate from "@/pages/Asset/Create.vue";
import AssetDestroy from "@/pages/Asset/Destroy.vue";
import AssetFreeze from "@/pages/Asset/Freeze.vue";
import AssetModify from "@/pages/Asset/Modify.vue";
import AssetRevoke from "@/pages/Asset/Revoke.vue";
import OptIn from "@/pages/Asset/OptIn.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Accounts,
  },
  {
    path: "/privacy-policy",
    name: "Privacy",
    component: Privacy,
  },
  {
    path: "/import-wallet",
    name: "ImportWallet",
    component: ImportWallet,
  },
  {
    path: "/asset",
    name: "Asset",
    component: Asset,
  },
  {
    path: "/asset/create",
    name: "AssetCreate",
    component: AssetCreate,
  },
  {
    path: "/asset/destroy/:assetId",
    name: "AssetDestroy",
    component: AssetDestroy,
  },
  {
    path: "/receive-payment/:account",
    name: "receive-payment",
    component: ReceivePayment,
  },
  {
    path: "/asset/freeze/:assetId",
    name: "AssetFreeze",
    component: AssetFreeze,
  },
  {
    path: "/asset/modify/:assetId",
    name: "AssetModify",
    component: AssetModify,
  },
  {
    path: "/asset/revoke/:assetId",
    name: "AssetRevoke",
    component: AssetRevoke,
  },
  {
    path: "/accounts",
    name: "Accounts",
    component: Accounts,
  },
  {
    path: "/account/:account",
    name: "AccountOverview",
    component: AccountOverview,
  },
  {
    path: "/account/optin/:account",
    name: "OptIn",
    component: OptIn,
  },
  {
    path: "/transaction/:id",
    name: "TransactionDetail",
    component: TransactionDetail,
  },
  {
    path: "/accounts/pay/:account",
    name: "PayWithAccount",
    component: Pay,
  },
  {
    path: "/pay/:toAccount",
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
