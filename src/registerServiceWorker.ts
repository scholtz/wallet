/* eslint-disable no-console */

import { register } from "register-service-worker";

if (import.meta.env.PROD) {
  register(`${import.meta.env.BASE_URL}service-worker.js`, {
    ready() {
      console.warn(
        "App is being served from cache by a service worker.\n" +
          "For more details, visit https://goo.gl/AFskqB"
      );
    },
    registered() {
      console.warn("Service worker has been registered.");
    },
    cached() {
      console.warn("Content has been cached for offline use.");
    },
    updatefound() {
      console.warn("New content is downloading.");
    },
    updated() {
      console.warn("New content is available; please refresh.");

      caches.keys().then(function (names) {
        for (const name of names) caches.delete(name);
      });
    },
    offline() {
      console.warn(
        "No internet connection found. App is running in offline mode."
      );
    },
    error(error) {
      console.error("Error during service worker registration:", error);
    },
  });
}
