// Node-only unit test for persisted Liquid Auth pairing records.
// Run via `pnpm run test:unit`.
import { test, expect } from "@playwright/test";
import {
  parseStoredLiquidSessions,
  toStoredLiquidSession,
} from "../../src/scripts/liquid/sessions";

const sample = {
  requestId: "0192b1c2-1234-7abc-8def-000000000001",
  origin: "https://liquid.biatec.io",
  address: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  device: "Biatec Wallet (web)",
  createdAt: 1_700_000_000_000,
  peer: {
    name: "Example dApp",
    description: "demo",
    url: "https://example.com",
    icons: ["https://example.com/icon.png"],
  },
  dappProviderId: "dapp-id",
};

test("parses a stored sessions array and ignores junk entries", () => {
  expect(parseStoredLiquidSessions(undefined)).toEqual([]);
  expect(parseStoredLiquidSessions(null)).toEqual([]);
  expect(parseStoredLiquidSessions("not-json")).toEqual([]);
  expect(parseStoredLiquidSessions({ requestId: "x" })).toEqual([]);

  const parsed = parseStoredLiquidSessions([
    sample,
    { origin: "https://x", address: "A" },
    "skip-me",
    {
      requestId: "rid-2",
      origin: "https://liquid.example",
      address: "BBBB",
      device: 12,
      createdAt: "nope",
    },
  ]);
  expect(parsed).toEqual([
    sample,
    {
      requestId: "rid-2",
      origin: "https://liquid.example",
      address: "BBBB",
      device: "",
      createdAt: 0,
    },
  ]);
});

test("parses a JSON string the same way as an already-parsed array", () => {
  expect(parseStoredLiquidSessions(JSON.stringify([sample]))).toEqual([sample]);
});

test("toStoredLiquidSession keeps only serializable pairing fields", () => {
  expect(
    toStoredLiquidSession({
      ...sample,
      status: "connected",
    } as typeof sample & { status: string }),
  ).toEqual({
    requestId: sample.requestId,
    origin: sample.origin,
    address: sample.address,
    device: sample.device,
    createdAt: sample.createdAt,
    peer: sample.peer,
    dappProviderId: sample.dappProviderId,
  });
});
