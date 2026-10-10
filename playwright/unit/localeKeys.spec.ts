// Every literal $t("a.b.c") / t("a.b.c") key used in src/ must exist in en.json under that exact
// namespace. check-locales only compares the shape of the locale files; vue-i18n renders a missing
// key as the raw key text (CLAUDE.md "Watch for cross-namespace $t() calls").
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "../../src");
const en = JSON.parse(
  fs.readFileSync(path.join(SRC, "locales/en.json"), "utf8"),
) as Record<string, unknown>;

function resolves(key: string): boolean {
  let node: unknown = en;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string";
}

function* files(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "locales" || entry.name === "generated") continue;
      yield* files(full);
    } else if (/\.(vue|ts)$/.test(entry.name)) {
      yield full;
    }
  }
}

// Files whose keys were added or moved in the audit remediation; every key they use must resolve.
const CHECKED = [
  "components/ConnectRequestsTable.vue",
  "components/DirectPopup.vue",
  "components/DirectNetworkCard.vue",
  "components/DirectAppCard.vue",
  "layouts/Main.vue",
];

for (const relative of CHECKED) {
  test(`every literal translation key in ${relative} exists in en.json`, () => {
    const text = fs.readFileSync(path.join(SRC, relative), "utf8");
    const keys = [...text.matchAll(/\bt\(\s*["'`]([a-z0-9_]+(?:\.[a-z0-9_]+)+)["'`]/g)].map(
      (m) => m[1],
    );
    expect(keys.length).toBeGreaterThan(0);
    const missing = keys.filter((key) => !resolves(key));
    expect(missing).toEqual([]);
  });
}

test("the scanner covers the files it claims to", () => {
  const all = [...files(SRC)].map((f) => path.relative(SRC, f).replaceAll("\\", "/"));
  for (const relative of CHECKED) expect(all).toContain(relative);
});
