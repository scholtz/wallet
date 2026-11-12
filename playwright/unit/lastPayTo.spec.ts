// Node-only unit tests for the "remember the last recipient" rule.
import { test, expect } from "@playwright/test";
import { recipientToRemember } from "../../src/scripts/lastPayTo";

const addr = (value: string) => ({ toString: () => value });

test.describe("recipientToRemember", () => {
  test("remembers the receiver of a payment and of an asset transfer", () => {
    expect(
      recipientToRemember({ type: "pay", payment: { receiver: addr("RECV1") } }),
    ).toBe("RECV1");
    expect(
      recipientToRemember({ type: "axfer", assetTransfer: { receiver: addr("RECV2") } }),
    ).toBe("RECV2");
  });

  test("never remembers a rekey, even when it looks like a payment", () => {
    expect(
      recipientToRemember({
        type: "pay",
        rekeyTo: addr("TAKEOVER"),
        payment: { receiver: addr("SELF") },
      }),
    ).toBeUndefined();
  });

  test("never remembers a transaction that closes an account", () => {
    expect(
      recipientToRemember({
        type: "pay",
        payment: { receiver: addr("RECV"), closeRemainderTo: addr("CLOSE") },
      }),
    ).toBeUndefined();
  });

  test("ignores other transaction types and missing data", () => {
    expect(recipientToRemember({ type: "appl" })).toBeUndefined();
    expect(recipientToRemember({ type: "pay" })).toBeUndefined();
    expect(recipientToRemember(undefined)).toBeUndefined();
    expect(recipientToRemember(null)).toBeUndefined();
  });
});
