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

import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import "primevue/resources/themes/saga-blue/theme.css";

import "primevue/resources/primevue.min.css";
import "primeicons/primeicons.css";

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

const myApp = createApp(App);
myApp.use(store);
myApp.use(router);
myApp.use(PrimeVue);
myApp.use(ToastService);
myApp.component("DataTable", DataTable);
myApp.component("Column", Column);
myApp.component("InputText", InputText);
myApp.component("Dialog", Dialog);
myApp.component("Toast", Toast);

myApp.config.globalProperties.$filters = {
  formatCurrency(
    value,
    language = "sk-SK",
    currency = "ALG",
    minimumFractionDigits = 6
  ) {
    const formatter = new Intl.NumberFormat(language, {
      style: "currency",
      currency,
      minimumFractionDigits,
    });
    if (Number.isInteger(parseInt(value))) {
      return formatter.format(value / 1000000);
    } else {
      return value;
    }
  },
};

myApp.mount("#app");
