import { test, expect } from "@playwright/test";
import { trackPending } from "../../src/scripts/trackPending";

test.describe("trackPending", () => {
  test("starts before and ends after a successful call, returning its value", async () => {
    const log: string[] = [];
    const result = await trackPending(
      () => log.push("start"),
      () => log.push("end"),
      async () => {
        log.push("run");
        return 42;
      },
    );
    expect(result).toBe(42);
    expect(log).toEqual(["start", "run", "end"]);
  });

  test("still ends when the call rejects and propagates the error", async () => {
    const log: string[] = [];
    await expect(
      trackPending(
        () => log.push("start"),
        () => log.push("end"),
        async () => {
          throw new Error("Ledger rejected");
        },
      ),
    ).rejects.toThrow("Ledger rejected");
    expect(log).toEqual(["start", "end"]);
  });
});
