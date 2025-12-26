import { createWebHistory, createRouter } from "vue-router";
import Privacy from "@/pages/Privacy.vue";
import ImportWallet from "@/pages/Wallet/ImportWallet.vue";
import NewWallet from "@/pages/Wallet/NewWallet.vue";
import Accounts from "@/pages/Accounts.vue";
import AccountOverview from "@/pages/AccountOverview.vue";
import AccountActions from "@/pages/Account/Actions.vue";
import AccountAssets from "@/pages/Account/Assets.vue";
import AccountTransactions from "@/pages/Account/Transactions.vue";
import TransactionDetail from "@/pages/TransactionDetail.vue";
import NotFound from "@/pages/404.vue";
import FAQ from "@/pages/FAQ.vue";
import Pay from "@/pages/Pay.vue";
import Sign from "@/pages/Sign.vue";
import SignAll from "@/pages/SignAll.vue";
import Merchant from "@/pages/Merchant.vue";
import ReceivePayment from "@/pages/ReceivePayment.vue";
import Connect from "@/pages/Connect.vue";
import Settings from "@/pages/Settings.vue";
import Asset from "@/pages/AssetList.vue";
import AssetCreate from "@/pages/Asset/Create.vue";
import AssetDestroy from "@/pages/Asset/Destroy.vue";
import AssetFreeze from "@/pages/Asset/Freeze.vue";
import AssetModify from "@/pages/Asset/Modify.vue";
import AssetRevoke from "@/pages/Asset/Revoke.vue";
import OptIn from "@/pages/Asset/OptIn.vue";
import OptInArc200 from "@/pages/Arc200/OptIn.vue";
import PaymentGateway from "@/pages/PaymentGateway.vue";
import GovernanceOverview from "@/pages/governance/Overview.vue";
import Donation from "@/pages/Donation.vue";
import Success from "@/pages/Success.vue";
import Swap from "@/pages/Swap.vue";
import Arc14 from "@/pages/Arc14.vue";
import NewAccount from "@/pages/NewAccount.vue";
import NewAccountLedger from "@/pages/NewAccount/Ledger.vue";
import NewAccountWalletConnect from "@/pages/NewAccount/WalletConnect.vue";
import NewAccount2FA from "@/pages/NewAccount/2FA.vue";
import NewAccountEmailPass from "@/pages/NewAccount/EmailPassword.vue";
import NewAccountShamir from "@/pages/NewAccount/Shamir.vue";
import NewAccountEd25519 from "@/pages/NewAccount/Ed25519.vue";
import NewAccountVanity from "@/pages/NewAccount/Vanity.vue";
import NewAccountMultisig from "@/pages/NewAccount/Multisig.vue";
import NewAccountWatch from "@/pages/NewAccount/Watch.vue";
import NewAccountImport from "@/pages/NewAccount/RecoverEd25519.vue";
import AccountExport from "@/pages/Account/Export.vue";

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
    path: "/new-account",
    name: "NewAccount",
    component: NewAccount,
  },
  {
    path: "/new-account/ed25519",
    name: "NewAccountEd25519",
    component: NewAccountEd25519,
  },
  {
    path: "/new-account/import-ed25519",
    name: "NewAccountImport",
    component: NewAccountImport,
  },
  {
    path: "/new-account/ledger",
    name: "NewAccountLedger",
    component: NewAccountLedger,
  },
  {
    path: "/new-account/2fa",
    name: "NewAccount2fa",
    component: NewAccount2FA,
  },
  {
    path: "/new-account/email-password",
    name: "NewAccount2emailpass",
    component: NewAccountEmailPass,
  },
  {
    path: "/new-account/wc",
    name: "NewAccountWalletConnect",
    component: NewAccountWalletConnect,
  },
  {
    path: "/new-account/shamir",
    name: "NewAccountShamir",
    component: NewAccountShamir,
  },
  {
    path: "/new-account/vanity",
    name: "NewAccountVanity",
    component: NewAccountVanity,
  },
  {
    path: "/new-account/multisig",
    name: "NewAccountMultisig",
    component: NewAccountMultisig,
  },
  {
    path: "/new-account/watch",
    name: "NewAccountWatch",
    component: NewAccountWatch,
  },
  {
    path: "/swap/:account",
    name: "Swap",
    component: Swap,
  },
  {
    path: "/swap/:account/:toAsset",
    name: "SwapWithTo",
    component: Swap,
  },
  {
    path: "/swap/:account/:toAsset/:fromAsset",
    name: "SwapWithToWithFrom",
    component: Swap,
  },
  {
    path: "/import-wallet",
    name: "ImportWallet",
    component: ImportWallet,
  },
  {
    path: "/new-wallet",
    name: "NewWallet",
    component: NewWallet,
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
    path: "/payment-gateway/:account",
    name: "PaymentGateway",
    component: PaymentGateway,
  },
  {
    path: "/arc14/:account",
    name: "ARC14",
    component: Arc14,
  },
  {
    path: "/payment-gateway/",
    name: "PaymentGateway1",
    component: PaymentGateway,
  },
  {
    path: "/asset/destroy/:assetId",
    name: "AssetDestroy",
    component: AssetDestroy,
  },
  {
    path: "/gateway/:b64/:settings",
    name: "Merchant",
    component: Merchant,
  },
  {
    path: "/gateway/:b64",
    name: "MerchantNoSettings",
    component: Merchant,
  },
  {
    path: "/receive-payment/:account",
    name: "receive-payment",
    component: ReceivePayment,
  },
  {
    path: "/account/connect/:account",
    name: "ConnectWithAccount",
    component: Connect,
  },
  {
    path: "/connect",
    name: "Connect",
    component: Connect,
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
    path: "/account/txs/:account",
    name: "AccountTransactions",
    component: AccountTransactions,
  },
  {
    path: "/account/assets/:account",
    name: "AccountAssets",
    component: AccountAssets,
  },
  {
    path: "/account/actions/:account",
    name: "AccountActions",
    component: AccountActions,
  },
  {
    path: "/account/export/:account",
    name: "AccountExport",
    component: AccountExport,
  },
  {
    path: "/account/optin/:account",
    name: "OptIn",
    component: OptIn,
  },
  {
    path: "/account/optinArc200/:account",
    name: "OptInArc200",
    component: OptInArc200,
  },
  {
    path: "/transaction/:id",
    name: "TransactionDetail",
    component: TransactionDetail,
  },
  {
    path: "/accounts/scheduled-payment/:account",
    name: "scheduled-payment",
    component: () => import("../pages/Account/ScheduledPayments.vue"),
  },
  {
    path: "/accounts/scheduled-payment/:account/:appId",
    name: "scheduled-payment-with-appid",
    component: () => import("../pages/Account/ScheduledPaymentDetail.vue"),
  },
  {
    path: "/accounts/:type/:account",
    name: "PayWithAccount",
    component: Pay,
  },
  {
    path: "/accounts/:type/:account/:asset",
    name: "PayWithAccountAndAsset",
    component: Pay,
  },
  {
    path: "/accounts/payTo/:account/:toAccountDirect/:asset",
    name: "PayToAccountAndAsset",
    component: Pay,
  },
  {
    path: "/pay/:toAccount",
    name: "Pay",
    component: Pay,
  },
  {
    path: "/sign/:account/:rawSignedTxnInput",
    name: "Sign",
    component: Sign,
  },
  {
    path: "/signAll/",
    name: "SignAll",
    component: SignAll,
  },
  {
    path: "/payWC/:account/:rawSignedTxnInput",
    name: "PayFromWalletConnect",
    component: Sign,
  },
  {
    path: "/multisig/:account/:rawSignedTxnInput",
    name: "PayMultisig",
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
  {
    path: "/multiaccount/:id",
    name: "GovernanceOverview",
    component: GovernanceOverview,
  },
  {
    path: "/donate",
    name: "Donation",
    component: Donation,
  },
  {
    path: "/success",
    name: "Success",
    component: Success,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
