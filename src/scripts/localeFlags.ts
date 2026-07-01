// Maps this app's locale codes (src/locales/<code>.json) to a flag image
// from the "flag-icons" npm package (https://www.npmjs.com/package/flag-icons),
// replacing the hand-vendored SVGs that used to live under public/flags.
//
// Each flag is imported individually (rather than importing the package's
// full flag-icons.css, which references all ~270 country flags via CSS
// url() and would make Vite bundle every flag instead of just the ones this
// app actually uses).
import gb from "flag-icons/flags/4x3/gb.svg";
import hu from "flag-icons/flags/4x3/hu.svg";
import it from "flag-icons/flags/4x3/it.svg";
import nl from "flag-icons/flags/4x3/nl.svg";
import sk from "flag-icons/flags/4x3/sk.svg";
import cz from "flag-icons/flags/4x3/cz.svg";
import es from "flag-icons/flags/4x3/es.svg";
import tr from "flag-icons/flags/4x3/tr.svg";
import za from "flag-icons/flags/4x3/za.svg";
import ru from "flag-icons/flags/4x3/ru.svg";

const localeToFlag: Record<string, string> = {
  en: gb,
  hu,
  it,
  nl,
  sk,
  cs: cz,
  es,
  tr,
  af: za,
  ru,
};

export default function localeFlagUrl(locale: string): string {
  return localeToFlag[locale] ?? "";
}
