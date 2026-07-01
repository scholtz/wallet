import { createApp } from "vue"; //h, markRaw
import App from "./App.vue";
import PrimeVue from "primevue/config";

//import page from "page";
//import routes from "./routes";
import store from "./store";
import router from "./router"; // <---
/*
const DefaultComponent = markRaw({
  render: () => h("div", "Loading…"),
});
/**/

import JsonViewer from "vue3-json-viewer";

//import "bootstrap";
//import "bootstrap/dist/css/bootstrap.min.css";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/space-grotesk/index.css";
import "./assets/tailwind.css";

import "./registerServiceWorker";

import moment from "moment";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Slider from "primevue/slider";
import PrimeDialog from "primevue/dialog";
import Toast from "primevue/toast";
import Accordion from "primevue/accordion";
import AccordionTab from "primevue/accordiontab";
import ToastService from "primevue/toastservice";
import Select from "primevue/select";
import Password from "primevue/password";
import ToggleSwitch from "primevue/toggleswitch";
import Menubar from "primevue/menubar";
import Badge from "primevue/badge";
import Avatar from "primevue/avatar";
import MultiSelect from "primevue/multiselect";
import Panel from "primevue/panel";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import InputGroup from "primevue/inputgroup";
import InputGroupAddon from "primevue/inputgroupaddon";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import Ripple from "primevue/ripple";
import Tooltip from "primevue/tooltip";
import ProgressSpinner from "primevue/progressspinner";
import Card from "primevue/card";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import LanguageFlag from "./components/LanguageFlag.vue";
import i18n from "./i18n";

/*
const SimpleRouterApp = {
  data: () => ({
    ViewComponent: null,
  }),

  render() {
    return h(this.ViewComponent || DefaultComponent);
  },

  created() {
    for (let route in routes) {
      page(route, () => {
        this.ViewComponent = markRaw(
          require("./pages/" + routes[route] + ".vue").default
        );
      });
    }
    page();
  },
};/**/

// Biatec brand preset: teal primary (#14b8a6 light / #2dd4bf dark), built on
// PrimeVue v4's Aura theme. Dark mode is toggled by adding/removing the
// "p-dark" class on <html> (see config/setTheme + App.vue), replacing the
// old runtime theme-CSS-file switcher.
const BiatecPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "{teal.50}",
      100: "{teal.100}",
      200: "{teal.200}",
      300: "{teal.300}",
      400: "{teal.400}",
      500: "{teal.500}",
      600: "{teal.600}",
      700: "{teal.700}",
      800: "{teal.800}",
      900: "{teal.900}",
      950: "{teal.950}",
    },
  },
});

const myApp = createApp(App).use(i18n);
myApp.use(store);
myApp.use(router);
myApp.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: BiatecPreset,
    options: {
      darkModeSelector: ".p-dark",
    },
  },
});
myApp.use(ToastService);
myApp.component("Button", Button);
myApp.component("Card", Card);
myApp.component("DataTable", DataTable);
myApp.component("Column", Column);
myApp.component("InputText", InputText);
myApp.component("Slider", Slider);
myApp.component("Dialog", PrimeDialog);
myApp.component("Toast", Toast);
myApp.component("Accordion", Accordion);
myApp.component("AccordionTab", AccordionTab);
myApp.component("Select", Select);
myApp.component("Password", Password);
myApp.component("ToggleSwitch", ToggleSwitch);
myApp.component("Menubar", Menubar);
myApp.component("Badge", Badge);
myApp.component("Avatar", Avatar);
myApp.component("MultiSelect", MultiSelect);
myApp.component("Panel", Panel);
myApp.component("InputNumber", InputNumber);
myApp.component("Textarea", Textarea);
myApp.component("InputGroup", InputGroup);
myApp.component("InputGroupAddon", InputGroupAddon);
myApp.component("Checkbox", Checkbox);
myApp.component("Message", Message);
myApp.component("ProgressSpinner", ProgressSpinner);
myApp.component("LanguageFlag", LanguageFlag);
myApp.directive("ripple", Ripple);
myApp.directive("tooltip", Tooltip);

myApp.use(JsonViewer);

myApp.config.globalProperties.$filters = {
  formatCurrencyBigInt(
    value = 0,
    currency: string = store.state.config.tokenSymbol as string,
    minimumFractionDigits = 6,
    multiply = true,
    language: string | string[] | undefined = (store.state.config
      .language as string) ?? undefined
  ) {
    let valueNumber = 0;
    if (multiply) {
      valueNumber = Number(value) / Number(10 ** Number(minimumFractionDigits));
    }
    const formatter = new Intl.NumberFormat(language, {
      minimumFractionDigits: Number(minimumFractionDigits),
    });
    return formatter.format(valueNumber) + " " + currency;
  },
  formatCurrency(
    value = 0,
    currency: string = store.state.config.tokenSymbol as string,
    minimumFractionDigits = 6,
    multiply = true,
    language: string | string[] | undefined = (store.state.config
      .language as string) ?? undefined
  ) {
    if (typeof value === "bigint")
      return this.formatCurrencyBigInt(
        value,
        currency,
        minimumFractionDigits,
        multiply,
        language
      );
    if (multiply) {
      value = value / Math.pow(10, minimumFractionDigits);
    }
    const formatter = new Intl.NumberFormat(language, {
      minimumFractionDigits,
    });
    return formatter.format(value) + " " + currency;
  },
  formatDateTime(
    value = 0,
    separator = " ",
    showSeconds = true,
    locale = "cs",
    alwaysShowDate = false
  ) {
    if (moment.locale() !== locale) moment.locale(locale);
    if (!value) return "";
    const valueMoment = moment.unix(value);
    if (!valueMoment.isValid()) return value;
    const separatorString = separator ? ` ${separator} ` : " ";
    if (
      valueMoment > moment().startOf("day") &&
      valueMoment < moment().endOf("day") &&
      !alwaysShowDate
    ) {
      return valueMoment.format(showSeconds ? "LTS" : "LT");
    }
    return (
      valueMoment.format("L") +
      separatorString +
      valueMoment.format(showSeconds ? "LTS" : "LT")
    );
  },
  formatPercent(value = 0) {
    if (!value) return "0 %";
    return Math.round(value * 1000) / 10 + " %";
  },
};

myApp.mount("#app");
