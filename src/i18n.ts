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
// Czech and Slovak use the same 3-way countable-noun split: 1 | 2-4 | 0,5+
// (no "teen exception" the way Russian has, e.g. "11 sekund" follows the
// 5+ form same as any other number ending outside 2-4).
function csSkPluralRule(choice: number): number {
  if (choice === 1) return 0;
  if (choice >= 2 && choice <= 4) return 1;
  return 2;
}

// Russian's 3-way split additionally depends on the last two digits, not
// just the last digit (e.g. "11 секунд", not "11 секунда", even though 11
// ends in 1) — see session_timeout_message in ru.json for the forms.
function ruPluralRule(choice: number): number {
  if (choice === 0) return 2;
  const mod10 = choice % 10;
  const mod100 = choice % 100;
  if (mod10 === 1 && mod100 !== 11) return 0;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 1;
  return 2;
}

export default createI18n({
  legacy: false,
  locale: defaultLanguage(),
  fallbackLocale: import.meta.env.VUE_APP_I18N_FALLBACK_LOCALE || "en",
  globalInjection: true,
  messages: loadLocaleMessages(),
  pluralRules: {
    cs: csSkPluralRule,
    sk: csSkPluralRule,
    ru: ruPluralRule,
  },
});
