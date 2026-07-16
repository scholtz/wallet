#!/usr/bin/env node

// Verifies every src/locales/<lang>.json file has the same keys, in the same
// order, as en.json (the source of truth). See CLAUDE.md "Localization".

import fs from "fs";
import path from "path";

const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");
const SOURCE_LOCALE = "en";
const OTHER_LOCALES = ["af", "cs", "es", "hu", "it", "nl", "ru", "sk", "tr"];

type JsonObject = { [key: string]: unknown };

function collectKeys(obj: JsonObject, prefix = ""): string[] {
  const out: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(fullKey);
      out.push(...collectKeys(value as JsonObject, fullKey));
    } else {
      out.push(fullKey);
    }
  }
  return out;
}

// Guards against reintroducing an HTML-injection sink like the one fixed
// under audit finding AW-2026-037 (see audits/risk-registry.md): the FAQ
// page renders locale strings via <i18n-t>'s named-slot interpolation
// (real anchor elements built in the component, URLs hardcoded there) so
// that translated content is never parsed as markup. Any locale string
// matching an HTML tag shape is a regression of that fix, whether it lands
// via a careless translation PR or a future feature that goes back to
// v-html. Matches an opening or closing tag shape (`<name ...>` / `</name>`);
// deliberately does not flag a bare `<`/`>` on its own, since strings like
// "Distribute algo 1->N" use `>` as an arrow, not markup.
const HTML_TAG_PATTERN = /<\/?[a-zA-Z][^>]*>/;

function collectHtmlLikeValues(obj: JsonObject, prefix = ""): string[] {
  const out: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...collectHtmlLikeValues(value as JsonObject, fullKey));
    } else if (typeof value === "string" && HTML_TAG_PATTERN.test(value)) {
      out.push(fullKey);
    }
  }
  return out;
}

interface LoadedLocale {
  filePath: string;
  data: JsonObject;
  raw: string;
}

function loadLocale(name: string): LoadedLocale {
  const filePath = path.join(LOCALES_DIR, `${name}.json`);
  const raw = fs.readFileSync(filePath, "utf8");
  return { filePath, data: JSON.parse(raw), raw };
}

function main(): void {
  const source = loadLocale(SOURCE_LOCALE);
  const sourceKeys = collectKeys(source.data);

  let hasMismatch = false;
  let hasHtmlLeak = false;

  const sourceHtmlLike = collectHtmlLikeValues(source.data);
  if (sourceHtmlLike.length) {
    hasHtmlLeak = true;
    console.log(`\n${SOURCE_LOCALE}.json: HTML-LIKE CONTENT`);
    console.log(`  keys (${sourceHtmlLike.length}):`, sourceHtmlLike);
  }

  for (const locale of OTHER_LOCALES) {
    const target = loadLocale(locale);
    const targetKeys = collectKeys(target.data);

    const missing = sourceKeys.filter((k) => !targetKeys.includes(k));
    const extra = targetKeys.filter((k) => !sourceKeys.includes(k));
    const orderMatches =
      JSON.stringify(sourceKeys) === JSON.stringify(targetKeys);

    const eofOk = target.raw.endsWith("\n");
    const htmlLike = collectHtmlLikeValues(target.data);

    if (missing.length || extra.length || !orderMatches || !eofOk) {
      hasMismatch = true;
      console.log(`\n${locale}.json: MISMATCH`);
      if (missing.length) {
        console.log(`  missing (${missing.length}):`, missing.slice(0, 20));
      }
      if (extra.length) {
        console.log(`  extra (${extra.length}):`, extra.slice(0, 20));
      }
      if (!orderMatches && !missing.length && !extra.length) {
        console.log("  key order differs from en.json");
      }
      if (!eofOk) console.log("  missing trailing newline at EOF");
    } else {
      console.log(`${locale}.json: OK`);
    }

    if (htmlLike.length) {
      hasHtmlLeak = true;
      console.log(`\n${locale}.json: HTML-LIKE CONTENT`);
      console.log(`  keys (${htmlLike.length}):`, htmlLike);
    }
  }

  if (hasHtmlLeak) {
    console.log(
      "\nOne or more locale values contain what looks like an HTML tag. Locale " +
        "strings must never carry raw markup (see audits/risk-registry.md " +
        "AW-2026-037): links belong in a component's <i18n-t> named-slot " +
        "interpolation (URL hardcoded in the .vue file, only the visible " +
        "label translated), never inline in the translated string."
    );
  }

  if (hasMismatch || hasHtmlLeak) {
    if (hasMismatch) {
      console.log(
        "\nFix: add/reorder missing keys to match en.json exactly, using the English value as a placeholder only if no real translation is available (prefer real translations - see CLAUDE.md)."
      );
    }
    process.exit(1);
  }

  console.log("\nAll locales match en.json.");
}

main();
