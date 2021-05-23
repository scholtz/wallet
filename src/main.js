import { createApp } from "vue"; //h, markRaw
import App from "./App.vue";
//import page from "page";
//import routes from "./routes";
import store from "./store";
import router from "./router"; // <---
/*
const DefaultComponent = markRaw({
  render: () => h("div", "Loading…"),
});
/**/
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "./registerServiceWorker";
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
createApp(App)
  .use(store)
  .use(router)
  .mount("#app");
