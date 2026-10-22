// Node-only unit tests for the public /gateway page helpers (AW-2026-076).
import { test, expect } from "@playwright/test";
import {
  gatewayIndexerEndpoint,
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
