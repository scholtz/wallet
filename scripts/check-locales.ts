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

  for (const locale of OTHER_LOCALES) {
    const target = loadLocale(locale);
    const targetKeys = collectKeys(target.data);

    const missing = sourceKeys.filter((k) => !targetKeys.includes(k));
    const extra = targetKeys.filter((k) => !sourceKeys.includes(k));
    const orderMatches =
      JSON.stringify(sourceKeys) === JSON.stringify(targetKeys);

    const eofOk = target.raw.endsWith("\n");

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
  }

  if (hasMismatch) {
    console.log(
      "\nFix: add/reorder missing keys to match en.json exactly, using the English value as a placeholder only if no real translation is available (prefer real translations - see CLAUDE.md)."
    );
    process.exit(1);
  }

  console.log("\nAll locales match en.json.");
}

main();
