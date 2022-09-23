import { createI18n } from "vue-i18n";

/**
 * Load locale messages
 *
 * The loaded `JSON` locale messages is pre-compiled by `@intlify/vue-i18n-loader`, which is integrated into `vue-cli-plugin-i18n`.
 * See: https://github.com/intlify/vue-i18n-loader#rocket-i18n-resource-pre-compilation
 */
function loadLocaleMessages() {
  const locales = require.context(
    "./locales",
    true,
    /[A-Za-z0-9-_,\s]+\.json$/i
  );
  const messages = {};
  locales.keys().forEach((key) => {
    const matched = key.match(/([A-Za-z0-9-_]+)\./i);
    if (matched && matched.length > 1) {
      const locale = matched[1];
      messages[locale] = locales(key).default;
    }
  });
  return messages;
}

function defaultLanguage() {
  let lang = localStorage.getItem("lang");
  if (lang) {
    return lang;
  }
  var userLang = navigator.language || navigator.userLanguage;
  if (userLang.length >= 2 && userLang.substring(0, 2) == "sk") {
    lang = "sk";
    localStorage.setItem("lang", lang);
    return lang;
  }
  if (userLang.length >= 2 && userLang.substring(0, 2) == "cs") {
    lang = "cs";
    localStorage.setItem("lang", lang);
    return lang;
  }
  if (userLang.length >= 2 && userLang.substring(0, 2) == "en") {
    lang = "en";
    localStorage.setItem("lang", lang);
    return lang;
  }

  lang = process.env.VUE_APP_I18N_LOCALE || "sk";
  localStorage.setItem("lang", lang);
  return lang;
}
export default createI18n({
  legacy: false,
  locale: defaultLanguage(),
  fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || "en",
  globalInjection: true,
  messages: loadLocaleMessages(),
});
