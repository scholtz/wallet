// Node-only unit test (no browser, no dev server) for the Liquid Auth wire
// protocol helpers in src/scripts/liquid/protocol.ts — the ARC-0027 CBOR
// envelope, base64url handling and liquid:// deep links. Run via
// `pnpm run test:unit` (playwright test -c playwright.unit.config.ts).
import { test, expect } from "@playwright/test";
import {
  LiquidReference,
  buildErrorResponse,
  buildRequest,
  buildResponse,
  decodeLiquidMessage,
  encodeLiquidMessage,
  fromBase64Url,
  generateLiquidDeepLink,
  isLiquidResponse,
  parseLiquidDeepLink,
  toBase64Url,
} from "../../src/scripts/liquid/protocol";

test("parses the liquid:// deep link shown by a dApp", () => {
  expect(
    parseLiquidDeepLink("liquid://liquid.biatec.io/?requestId=0192b1c2-1234-7abc-8def-000000000001")
  ).toEqual({
    origin: "https://liquid.biatec.io",
    requestId: "0192b1c2-1234-7abc-8def-000000000001",
  });
  expect(parseLiquidDeepLink("  liquid://example.com/liquid/?requestId=r&x=1 ")).toEqual({
    origin: "https://example.com/liquid",
    requestId: "r",
  });
  expect(generateLiquidDeepLink("https://liquid.biatec.io", "abc")).toBe(
    "liquid://liquid.biatec.io/?requestId=abc"
  );
});

test("rejects links that are not liquid:// or lack a requestId", () => {
  expect(() => parseLiquidDeepLink("wc:topic@2?relay-protocol=irn")).toThrow(/liquid/);
  expect(() => parseLiquidDeepLink("liquid://host/")).toThrow(/requestId/);
});

test("base64url accepts standard base64 too and round-trips", () => {
  const bytes = new Uint8Array([0, 251, 252, 253, 254, 255, 1]);
  const encoded = toBase64Url(bytes);
  expect(encoded).not.toMatch(/[+/=]/);
  expect(fromBase64Url(encoded)).toEqual(bytes);
  expect(fromBase64Url(Buffer.from(bytes).toString("base64"))).toEqual(bytes);
});

test("ARC-0027 request/response envelopes survive CBOR + base64url", async () => {
  const request = buildRequest(LiquidReference.signTransactionsRequest, {
    providerId: "dapp",
    txns: [{ txn: "AAEC" }, { txn: "AQID", signers: [] }],
  });
  const decodedRequest = await decodeLiquidMessage(await encodeLiquidMessage(request));
  expect(decodedRequest).toEqual(request);
  expect(isLiquidResponse(decodedRequest)).toBe(false);

  const response = buildResponse(request, LiquidReference.signTransactionsResponse, {
    providerId: "wallet",
    stxns: ["c2ln", null],
  });
  const decodedResponse = await decodeLiquidMessage(await encodeLiquidMessage(response));
  expect(isLiquidResponse(decodedResponse)).toBe(true);
  expect(decodedResponse).toEqual(response);

  const error = buildErrorResponse(request, LiquidReference.signTransactionsResponse, {
    code: 4001,
    message: "User rejected.",
  });
  const decodedError = await decodeLiquidMessage(await encodeLiquidMessage(error));
  expect((decodedError as typeof error).error?.code).toBe(4001);
});
