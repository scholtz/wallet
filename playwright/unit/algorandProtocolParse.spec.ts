// Node-only unit tests for the payment-link parser (AW-2026-084 / AW-2026-083).
import { test, expect } from "@playwright/test";
import aprotocol from "../../src/shared/algorand-protocol-parse";

const parse = (query: string) =>
  aprotocol.parseAlgorandProtocolParameters(`algorand://ADDR?${query}`);

test.describe("parseAlgorandProtocolParameters base units", () => {
  test("without decimals the amount and fee stay as written", () => {
    const link = parse("amount=1000000&fee=2000");
    expect(link.payamountbase).toBe("1000000");
    expect(link.feebase).toBe("2000");
  });

  test("with decimals the base amount is still the text of the link, not a Number", () => {
    const link = parse("amount=123456789012345678901&decimals=18&fee=1000");
    expect(link.payamountbase).toBe("123456789012345678901");
    expect(link.feebase).toBe("1000");
    expect(link.decimals).toBe(18);
    expect(link.payamount).toBeCloseTo(123.456789012345678901);
  });

  test("a non-numeric amount is kept as text so the gateway can refuse the link", () => {
    const link = parse("amount=abc&decimals=6");
    expect(link.payamountbase).toBe("abc");
    expect(link.payamount).toBeUndefined();
  });

  test("a payee without parameters has no amount or fee", () => {
    const link = aprotocol.parseAlgorandProtocolParameters("algorand://ADDR");
    expect(link).toMatchObject({ payTo: "ADDR" });
    expect(link.payamountbase).toBeUndefined();
  });
});
