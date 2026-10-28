// Node-only unit tests for the ARC-14 realm guard (AW-2026-087).
import { test, expect } from "@playwright/test";
import {
  assertRemoteArc14Realm,
  isReservedArc14Realm,
} from "../../src/scripts/encoding/arc14";

test.describe("isReservedArc14Realm", () => {
  test("recognises the realms the wallet uses for its own services", () => {
    expect(isReservedArc14Realm("BiatecRouter#ARC14")).toBe(true);
    expect(isReservedArc14Realm("BiatecScan#ARC14")).toBe(true);
  });

  test("ignores case, whitespace and a missing marker", () => {
    expect(isReservedArc14Realm("  biatecrouter#arc14 ")).toBe(true);
    expect(isReservedArc14Realm("BiatecRouter")).toBe(true);
  });

  test("other realms and non-strings are not reserved", () => {
    expect(isReservedArc14Realm("BiatecParticipation#ARC14")).toBe(false);
    expect(isReservedArc14Realm("")).toBe(false);
    expect(isReservedArc14Realm(undefined)).toBe(false);
    expect(isReservedArc14Realm({ realm: "BiatecRouter#ARC14" })).toBe(false);
  });
});

test.describe("assertRemoteArc14Realm", () => {
  test("passes an ordinary realm through unchanged", () => {
    expect(assertRemoteArc14Realm("Participation#ARC14")).toBe("Participation#ARC14");
  });

  test("refuses a remote host that answers with another service's realm", () => {
    expect(() => assertRemoteArc14Realm("BiatecRouter#ARC14")).toThrow(/another service/);
  });
});
