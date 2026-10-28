// Node-only unit tests for the public /gateway page helpers (AW-2026-076).
import { test, expect } from "@playwright/test";
import {
  gatewayExpectedPayment,
  gatewayIndexerEndpoint,
  isExpectedPayment,
  isAlgorandPaymentUri,
  sanitizeGatewaySettings,
  sanitizeRedirectUrl,
} from "../../src/scripts/merchantGateway";

test.describe("isAlgorandPaymentUri", () => {
  test("accepts the algorand and web+algorand schemes", () => {
    expect(isAlgorandPaymentUri("algorand://ADDR?amount=1")).toBe(true);
    expect(isAlgorandPaymentUri("web+algorand://ADDR?amount=1")).toBe(true);
  });

  test("refuses script, data and bare strings", () => {
    expect(isAlgorandPaymentUri("javascript:alert(1)")).toBe(false);
    expect(isAlgorandPaymentUri("data:text/html,<script>1</script>")).toBe(false);
    expect(isAlgorandPaymentUri("https://evil.example")).toBe(false);
    expect(isAlgorandPaymentUri("")).toBe(false);
  });
});

test.describe("sanitizeRedirectUrl", () => {
  test("allows https URLs", () => {
    expect(sanitizeRedirectUrl("https://shop.example/ok?o=1")).toBe(
      "https://shop.example/ok?o=1",
    );
  });

  test("allows http only on loopback", () => {
    expect(sanitizeRedirectUrl("http://localhost:3000/ok")).toBe("http://localhost:3000/ok");
    expect(sanitizeRedirectUrl("http://127.0.0.1/ok")).toBe("http://127.0.0.1/ok");
    expect(sanitizeRedirectUrl("http://[::1]/ok")).toBe("http://[::1]/ok");
    expect(sanitizeRedirectUrl("http://shop.example/ok")).toBeUndefined();
  });

  test("refuses javascript:, data:, relative and protocol-relative values", () => {
    expect(sanitizeRedirectUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeRedirectUrl("JaVaScRiPt:alert(1)")).toBeUndefined();
    expect(sanitizeRedirectUrl(" javascript:alert(1)")).toBeUndefined();
    expect(sanitizeRedirectUrl("data:text/html,x")).toBeUndefined();
    expect(sanitizeRedirectUrl("/relative/path")).toBeUndefined();
    expect(sanitizeRedirectUrl("//evil.example/x")).toBeUndefined();
    expect(sanitizeRedirectUrl("")).toBeUndefined();
  });

  test("refuses URLs with embedded credentials and non-strings", () => {
    expect(sanitizeRedirectUrl("https://shop.example@evil.example/")).toBeUndefined();
    expect(sanitizeRedirectUrl("https://user:pw@evil.example/")).toBeUndefined();
    expect(sanitizeRedirectUrl(42)).toBeUndefined();
    expect(sanitizeRedirectUrl(null)).toBeUndefined();
  });
});

test.describe("sanitizeGatewaySettings", () => {
  test("keeps valid cancel and success URLs", () => {
    expect(
      sanitizeGatewaySettings({
        cancel: "https://shop.example/cancel",
        success: "https://shop.example/paid",
      }),
    ).toEqual({
      cancel: "https://shop.example/cancel",
      success: "https://shop.example/paid",
    });
  });

  test("drops unsafe values and unknown keys", () => {
    expect(
      sanitizeGatewaySettings({
        cancel: "javascript:alert(1)",
        success: "https://shop.example/paid",
        extra: "x",
      }),
    ).toEqual({ success: "https://shop.example/paid" });
  });

  test("non-object JSON yields empty settings", () => {
    expect(sanitizeGatewaySettings(null)).toEqual({});
    expect(sanitizeGatewaySettings("str")).toEqual({});
    expect(sanitizeGatewaySettings(5)).toEqual({});
    expect(sanitizeGatewaySettings(["https://a.example"])).toEqual({});
  });
});

test.describe("gatewayIndexerEndpoint", () => {
  test("maps the networks the page supports", () => {
    expect(gatewayIndexerEndpoint("mainnet")?.server).toContain("mainnet-idx");
    expect(gatewayIndexerEndpoint("mainnet-v1.0")?.server).toContain("mainnet-idx");
    expect(gatewayIndexerEndpoint("testnet")?.server).toContain("testnet-idx");
    expect(gatewayIndexerEndpoint("aramidmain")?.server).toContain("aramidmain");
    expect(gatewayIndexerEndpoint("sandbox")?.server).toBe("http://localhost:8980");
  });

  test("unknown or missing network falls back to the configured indexer", () => {
    expect(gatewayIndexerEndpoint(undefined)).toBeUndefined();
    expect(gatewayIndexerEndpoint("https://evil.example")).toBeUndefined();
  });
});

// AW-2026-084: "paid" means the right receiver, asset and amount, not just a note match.
test.describe("isExpectedPayment", () => {
  const PAYEE = "PAYEEADDRESS";
  const algo = (amount: bigint, receiver = PAYEE) => ({
    id: "T1",
    paymentTransaction: { receiver, amount },
  });
  const asa = (amount: bigint, assetId: bigint, receiver = PAYEE) => ({
    id: "T2",
    assetTransferTransaction: { receiver, amount, assetId },
  });
  const expectAlgo = gatewayExpectedPayment({ payTo: PAYEE, amountBase: "1000000" });
  const expectAsa = gatewayExpectedPayment({ payTo: PAYEE, asset: "312769", amountBase: "5000" });

  test("accepts the requested ALGO amount or more", () => {
    expect(isExpectedPayment(algo(1_000_000n), expectAlgo)).toBe(true);
    expect(isExpectedPayment(algo(2_000_000n), expectAlgo)).toBe(true);
  });

  test("refuses an underpayment, a zero payment and a payment to someone else", () => {
    expect(isExpectedPayment(algo(999_999n), expectAlgo)).toBe(false);
    expect(isExpectedPayment(algo(0n), expectAlgo)).toBe(false);
    expect(isExpectedPayment(algo(1_000_000n, "OTHER"), expectAlgo)).toBe(false);
  });

  test("a link without an amount still needs a non-zero payment", () => {
    const noAmount = gatewayExpectedPayment({ payTo: PAYEE });
    expect(isExpectedPayment(algo(1n), noAmount)).toBe(true);
    expect(isExpectedPayment(algo(0n), noAmount)).toBe(false);
  });

  test("an asset link needs that asset, not ALGO and not another asset", () => {
    expect(isExpectedPayment(asa(5000n, 312769n), expectAsa)).toBe(true);
    expect(isExpectedPayment(asa(4999n, 312769n), expectAsa)).toBe(false);
    expect(isExpectedPayment(asa(5000n, 1n), expectAsa)).toBe(false);
    expect(isExpectedPayment(algo(5_000_000n), expectAsa)).toBe(false);
    expect(isExpectedPayment(asa(5000n, 312769n, "OTHER"), expectAsa)).toBe(false);
  });

  test("an ALGO link refuses an asset transfer of the same number", () => {
    expect(isExpectedPayment(asa(1_000_000n, 312769n), expectAlgo)).toBe(false);
  });

  test("a transaction that only mentions the payee (no payment fields) is not a payment", () => {
    expect(isExpectedPayment({ id: "T3" }, expectAlgo)).toBe(false);
  });

  test("garbage amounts in the link fall back to no minimum", () => {
    expect(gatewayExpectedPayment({ payTo: PAYEE, amountBase: "abc" }).minAmount).toBe(0n);
    expect(gatewayExpectedPayment({ payTo: PAYEE, amountBase: -5 }).minAmount).toBe(0n);
    expect(gatewayExpectedPayment({ payTo: PAYEE, asset: "x" }).assetId).toBe(0n);
  });
});
