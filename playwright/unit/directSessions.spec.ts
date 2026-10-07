// Node-only unit tests for Biatec Direct site grants (parse / upsert / prune).
import { test, expect } from "@playwright/test";
import {
  parseStoredDirectSessions,
  pruneDirectSessions,
  upsertDirectSession,
  type StoredDirectSession,
} from "../../src/scripts/direct/sessions";
import { MAX_DIRECT_SESSIONS } from "../../src/scripts/direct/protocol";

const A = "ARAMIDFJYV2TOFB5MRNZJIXBSAVZCVAUDAPFGKR5PNX4MTILGAZABBTXQQ";
const B = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";
const HASH = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8";

const session = (origin: string, extra: Partial<StoredDirectSession> = {}): StoredDirectSession => ({
  origin,
  addresses: [A],
  genesisHash: HASH,
  createdAt: 1,
  lastUsedAt: 1,
  ...extra,
});

test.describe("parseStoredDirectSessions", () => {
  test("round-trips valid sessions, also from a JSON string", () => {
    const stored = [session("https://dapp.example.com", { peer: { name: "n", description: "d", url: "https://dapp.example.com", icons: [] } })];
    expect(parseStoredDirectSessions(stored)).toEqual(stored);
    expect(parseStoredDirectSessions(JSON.stringify(stored))).toEqual(stored);
  });

  test("returns [] for garbage", () => {
    expect(parseStoredDirectSessions(undefined)).toEqual([]);
    expect(parseStoredDirectSessions("not json")).toEqual([]);
    expect(parseStoredDirectSessions({})).toEqual([]);
  });

  test("drops tampered entries: bad origin, bad addresses, bad hash, duplicates", () => {
    const parsed = parseStoredDirectSessions([
      session("http://evil.example.com"),
      session("https://ok.example.com", { addresses: [] }),
      session("https://ok.example.com", { addresses: ["short"] }),
      session("https://ok.example.com", { genesisHash: "x" }),
      session("https://good.example.com"),
      session("https://good.example.com", { addresses: [B] }),
      null,
      42,
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].origin).toBe("https://good.example.com");
    expect(parsed[0].addresses).toEqual([A]);
  });
});

test("upsertDirectSession replaces the grant of the same origin", () => {
  const existing = [session("https://a.example.com"), session("https://b.example.com")];
  const next = upsertDirectSession(existing, session("https://a.example.com", { addresses: [B] }));
  expect(next).toHaveLength(2);
  expect(next.find((s) => s.origin === "https://a.example.com")?.addresses).toEqual([B]);
});

test("upsertDirectSession caps the list, dropping the least recently used", () => {
  let list: StoredDirectSession[] = [];
  for (let i = 0; i < MAX_DIRECT_SESSIONS; i++) {
    list = upsertDirectSession(list, session(`https://s${i}.example.com`, { lastUsedAt: i + 10 }));
  }
  list = upsertDirectSession(list, session("https://new.example.com", { lastUsedAt: 9999 }));
  expect(list).toHaveLength(MAX_DIRECT_SESSIONS);
  expect(list.some((s) => s.origin === "https://s0.example.com")).toBe(false);
  expect(list.some((s) => s.origin === "https://new.example.com")).toBe(true);
});

test("pruneDirectSessions removes addresses the wallet no longer holds", () => {
  const pruned = pruneDirectSessions(
    [session("https://a.example.com", { addresses: [A, B] }), session("https://b.example.com", { addresses: [B] })],
    [A],
  );
  expect(pruned).toHaveLength(1);
  expect(pruned[0].addresses).toEqual([A]);
});
