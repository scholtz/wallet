// Node-only unit tests for the clipboard auto-clear (AW-2026-109).
import { test, expect } from "@playwright/test";
import {
  clearIfUnchanged,
  scheduleClipboardClear,
  type ClipboardLike,
} from "../../src/scripts/clipboard";

const fakeClipboard = (initial: string) => {
  const state = { text: initial };
  const clipboard: ClipboardLike = {
    readText: async () => state.text,
    writeText: async (text: string) => {
      state.text = text;
    },
  };
  return { state, clipboard };
};

test.describe("clearIfUnchanged", () => {
  test("clears the clipboard while it still holds the copied secret", async () => {
    const { state, clipboard } = fakeClipboard("word1 word2");
    expect(await clearIfUnchanged("word1 word2", clipboard)).toBe(true);
    expect(state.text).toBe("");
  });

  test("never overwrites something the user copied afterwards", async () => {
    const { state, clipboard } = fakeClipboard("something else");
    expect(await clearIfUnchanged("word1 word2", clipboard)).toBe(false);
    expect(state.text).toBe("something else");
  });

  test("leaves the clipboard alone when reading it is not permitted", async () => {
    const clipboard: ClipboardLike = {
      readText: async () => {
        throw new Error("NotAllowedError");
      },
      writeText: async () => {
        throw new Error("must not be called");
      },
    };
    expect(await clearIfUnchanged("secret", clipboard)).toBe(false);
  });
});

test.describe("scheduleClipboardClear", () => {
  test("clears after the delay and a newer copy replaces the pending clear", async () => {
    const { state, clipboard } = fakeClipboard("first");
    scheduleClipboardClear("first", clipboard, 30);
    state.text = "second";
    scheduleClipboardClear("second", clipboard, 30);
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(state.text).toBe("");
  });
});
