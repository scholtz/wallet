// Node-only unit tests for the cross-tab shared wc item merge used by saveWallet/changePassword.
import { test, expect } from "@playwright/test";
import { SHARED_WC_KEYS, mergeSharedWcItems } from "../../src/scripts/walletSharedItems";

const KEY = "direct:sessions";

test("the Direct sessions key is a shared key", () => {
  expect(SHARED_WC_KEYS).toContain(KEY);
});

test("a stale in-memory copy never overwrites the persisted shared value", () => {
  const merged = mergeSharedWcItems(
    { [KEY]: '["stale"]', other: "mine" },
    { [KEY]: '["fresh"]', other: "theirs" },
  );
  expect(merged[KEY]).toBe('["fresh"]');
  // Non-shared items are this tab's own state, untouched.
  expect(merged.other).toBe("mine");
});

test("a grant revoked elsewhere (key removed) is not restored from memory", () => {
  const merged = mergeSharedWcItems({ [KEY]: '["revoked"]', other: "x" }, { other: "x" });
  expect(KEY in merged).toBe(false);
  expect(merged.other).toBe("x");
});

test("a grant added elsewhere is kept even if this tab never saw it", () => {
  expect(mergeSharedWcItems({ other: "x" }, { [KEY]: '["new"]' })[KEY]).toBe('["new"]');
});

test("does not mutate its inputs and tolerates missing maps", () => {
  const memory = { [KEY]: "a" };
  const persisted = { [KEY]: "b" };
  mergeSharedWcItems(memory, persisted);
  expect(memory[KEY]).toBe("a");
  expect(persisted[KEY]).toBe("b");
  expect(mergeSharedWcItems(undefined, undefined)).toEqual({});
});

test("a prototype-named key in the persisted map cannot inject a shared value", () => {
  const persisted = JSON.parse('{"__proto__": {"direct:sessions": "evil"}}');
  expect(mergeSharedWcItems({}, persisted)[KEY]).toBeUndefined();
});
