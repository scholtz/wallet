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

// AW-2026-124: reading the clipboard needs focus, so an unverifiable clear is retried on focus.
test.describe("scheduleClipboardClear without focus", () => {
  const fakeWindow = () => {
    const listeners = new Set<() => void>();
    return {
      listeners,
      target: {
        addEventListener: (_type: "focus", listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: "focus", listener: () => void) => listeners.delete(listener),
      },
      focus: () => [...listeners].forEach((listener) => listener()),
    };
  };

  test("retries when the page regains focus and then clears", async () => {
    const win = fakeWindow();
    const state = { text: "secret", readable: false };
    const clipboard: ClipboardLike = {
      readText: async () => {
        if (!state.readable) throw new Error("NotAllowedError: document not focused");
        return state.text;
      },
      writeText: async (text: string) => {
        state.text = text;
      },
    };
    scheduleClipboardClear("secret", clipboard, 10, win.target);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(state.text).toBe("secret");
    expect(win.listeners.size).toBe(1);
    state.readable = true;
    win.focus();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(state.text).toBe("");
    expect(win.listeners.size).toBe(0);
  });

  test("a later copy cancels the pending retry and never clears the newer content", async () => {
    const win = fakeWindow();
    const state = { text: "first", readable: false };
    const clipboard: ClipboardLike = {
      readText: async () => {
        if (!state.readable) throw new Error("NotAllowedError");
        return state.text;
      },
      writeText: async (text: string) => {
        state.text = text;
      },
    };
    scheduleClipboardClear("first", clipboard, 10, win.target);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(win.listeners.size).toBe(1);
    // The user copies something else and the wallet schedules nothing for it.
    state.text = "unrelated";
    state.readable = true;
    scheduleClipboardClear("newer secret", clipboard, 5_000, win.target);
    expect(win.listeners.size).toBe(0);
    win.focus();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(state.text).toBe("unrelated");
  });

  test("a permanently denied read stops being retried after a few focus events", async () => {
    const win = fakeWindow();
    const clipboard: ClipboardLike = {
      readText: async () => {
        throw new Error("NotAllowedError");
      },
      writeText: async () => undefined,
    };
    scheduleClipboardClear("secret", clipboard, 5, win.target);
    await new Promise((resolve) => setTimeout(resolve, 30));
    for (let i = 0; i < 6; i++) {
      win.focus();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(win.listeners.size).toBe(0);
  });
});
