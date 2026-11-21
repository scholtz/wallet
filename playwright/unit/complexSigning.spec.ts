import { test, expect } from "@playwright/test";
import {
  resolveSigningRoute,
  signAllReturnLabelKey,
  signAllReturnPath,
} from "../../src/scripts/signing/complexSigning";

test.describe("resolveSigningRoute", () => {
  test("accounts with a key in the wallet sign in place", () => {
    for (const type of ["sk", "hd", "falcon1024"] as const) {
      expect(resolveSigningRoute(type)).toBe("direct");
    }
  });
  test("multisig / 2FA and Ledger go through the Sign-all page", () => {
    for (const type of ["msig", "ledger"] as const) {
      expect(resolveSigningRoute(type)).toBe("signAll");
    }
  });
  test("an account the wallet cannot sign for is refused", () => {
    expect(resolveSigningRoute("?")).toBe("none");
  });
});

test.describe("signAllReturnPath", () => {
  test("uses the path recorded by the originating page", () => {
    expect(signAllReturnPath("Swap", "/swap/ADDR/1/2", "OTHER")).toBe(
      "/swap/ADDR/1/2",
    );
  });
  test("scheduled payments keep working without a recorded path", () => {
    expect(signAllReturnPath("ScheduledPayments", "", "ADDR")).toBe(
      "/accounts/scheduled-payment/ADDR",
    );
  });
  test("nothing to return to without a key, or with an unusable path", () => {
    expect(signAllReturnPath("", "/swap/A", "ADDR")).toBeUndefined();
    expect(signAllReturnPath("Swap", "", "ADDR")).toBeUndefined();
    expect(signAllReturnPath("ScheduledPayments", "", "")).toBeUndefined();
  });
  test("never navigates to another origin", () => {
    expect(
      signAllReturnPath("Swap", "//evil.example/x", "ADDR"),
    ).toBeUndefined();
    expect(
      signAllReturnPath("Swap", "https://evil.example/x", "ADDR"),
    ).toBeUndefined();
  });
});

test("return label keys", () => {
  expect(signAllReturnLabelKey("Swap")).toBe("return_to_swap");
  expect(signAllReturnLabelKey("ScheduledPayments")).toBe(
    "return_to_scheduled_payments",
  );
  expect(signAllReturnLabelKey("AssetOptIn")).toBe("return_to_previous");
});
