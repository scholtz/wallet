import { test, expect } from "@playwright/test";
import {
  payWcPath,
  connectReturnPath,
} from "../../src/scripts/wcNavigation";

const ADDR = "ARAMIDFJYV2TOFB5MRNZJIXBSAVZCVAUDAPFGKR5PNX4MTILGAZABBTXQQ";
const OTHER = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

test.describe("payWcPath", () => {
  test("uses the connected account when known", () => {
    expect(payWcPath(ADDR, OTHER, "jaRhcGFh")).toBe(`/payWC/${ADDR}/jaRhcGFh`);
  });

  test("regression #189: never produces an empty account segment", () => {
    expect(payWcPath("", OTHER, "jaRhcGFh")).toBe(`/payWC/${OTHER}/jaRhcGFh`);
    expect(payWcPath(undefined, OTHER, "jaRhcGFh")).toBe(
      `/payWC/${OTHER}/jaRhcGFh`,
    );
    expect(payWcPath("", OTHER, "x")).not.toContain("//");
  });
});

test.describe("connectReturnPath", () => {
  test("returns to the account-scoped connect page", () => {
    expect(connectReturnPath(ADDR)).toBe(`/account/connect/${ADDR}`);
  });

  test("falls back to /connect without an account", () => {
    expect(connectReturnPath("")).toBe("/connect");
    expect(connectReturnPath(undefined)).toBe("/connect");
  });

  test("inside a Biatec Direct popup the return path is /direct", () => {
    expect(connectReturnPath(ADDR, true)).toBe("/direct");
    expect(connectReturnPath(undefined, true)).toBe("/direct");
    expect(connectReturnPath(ADDR, false)).toBe(`/account/connect/${ADDR}`);
  });
});
