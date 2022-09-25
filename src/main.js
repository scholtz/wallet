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
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./registerServiceWorker";

import moment from "moment";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Slider from "primevue/slider";
import Dialog from "primevue/dialog";
import Toast from "primevue/toast";
import Accordion from "primevue/accordion";
import AccordionTab from "primevue/accordiontab";
import ToastService from "primevue/toastservice";
import Dropdown from "primevue/dropdown";
import Password from "primevue/password";
import InputSwitch from "primevue/inputswitch";
import "primevue/resources/themes/saga-blue/theme.css";

import "primevue/resources/primevue.min.css";
import "primeicons/primeicons.css";
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

const myApp = createApp(App).use(i18n);
myApp.use(store);
myApp.use(router);
myApp.use(PrimeVue);
myApp.use(ToastService);
myApp.component("DataTable", DataTable);
myApp.component("Column", Column);
myApp.component("InputText", InputText);
myApp.component("Slider", Slider);
myApp.component("Dialog", Dialog);
myApp.component("Toast", Toast);
myApp.component("Accordion", Accordion);
myApp.component("AccordionTab", AccordionTab);
myApp.component("Dropdown", Dropdown);
myApp.component("Password", Password);
myApp.component("InputSwitch", InputSwitch);

myApp.config.globalProperties.$filters = {
  formatCurrency(
    value,
    currency = "ALG",
    minimumFractionDigits = 6,
    multiply = true,
    language = "sk-SK"
  ) {
    if (multiply) {
      value = value / Math.pow(10, minimumFractionDigits);
    }
    const formatter = new Intl.NumberFormat(language, {
      minimumFractionDigits,
    });
    return formatter.format(value) + " " + currency;
    /*
    if (currency.length == 3) {
      const formatter = new Intl.NumberFormat(language, {
        style: "currency",
        currency,
        minimumFractionDigits,
        maximumFractionDigits: minimumFractionDigits,
      });
      const ret = formatter.format();
      console.log("currency", currency, minimumFractionDigits, value, ret);

      return ret;
    } else {
    }*/
  },
  formatDateTime(
    value,
    separator,
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
  formatPercent(value) {
    if (!value) return "0 %";
    return Math.round(value * 1000) / 10 + " %";
  },
};

myApp.mount("#app");
