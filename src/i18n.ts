import { createI18n, type VueMessageType } from "vue-i18n";
import type { LocaleMessage } from "@intlify/core-base";

/**
 * Load locale messages
 */
type LocaleMessages = Record<string, LocaleMessage<VueMessageType>>;

function loadLocaleMessages(): LocaleMessages {
  const locales = import.meta.glob("./locales/**/*.json", { eager: true });
  const messages: LocaleMessages = {};
  for (const path in locales) {
    const matched = path.match(/([A-Za-z0-9-_]+)\.json$/i);
    if (matched && matched.length > 1) {
      const locale = matched[1];
      messages[locale] = (locales[path] as any).default;
    }
  }
  return messages;
}

function defaultLanguage(): string {
  let lang: string | null = localStorage.getItem("lang");
  if (lang) {
    return lang;
  }
  const navigatorWithLang = navigator as Navigator & {
    userLanguage?: string;
  };
  const userLang = navigator.language || navigatorWithLang.userLanguage || "";
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

  const defaultLang = import.meta.env.VUE_APP_I18N_LOCALE || "sk";
  localStorage.setItem("lang", defaultLang);
  return defaultLang;
}
export default createI18n({
  legacy: false,
  locale: defaultLanguage(),
  fallbackLocale: import.meta.env.VUE_APP_I18N_FALLBACK_LOCALE || "en",
  globalInjection: true,
  messages: loadLocaleMessages(),
});
