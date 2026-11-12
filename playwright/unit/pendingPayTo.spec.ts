// Node-only unit tests for the Pay -> Sign recipient hand-over.
import { test, expect } from "@playwright/test";
import { setPendingPayTo, takePendingPayTo } from "../../src/scripts/pendingPayTo";

test("the pending recipient is handed over exactly once", () => {
  setPendingPayTo("RECIPIENT");
  expect(takePendingPayTo()).toBe("RECIPIENT");
  expect(takePendingPayTo()).toBeUndefined();
});

test("an empty recipient is not pending", () => {
  setPendingPayTo("");
  expect(takePendingPayTo()).toBeUndefined();
});
