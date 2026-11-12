/**
 * Secrets (mnemonics, auth tokens) copied to the system clipboard stay readable by any native app
 * and by OS clipboard history until something else is copied (AW-2026-109). This clears the
 * clipboard after a delay, but only when it still holds exactly the copied value, so something
 * the user copied in the meantime is never overwritten.
 */
export const CLIPBOARD_CLEAR_DELAY_MS = 60_000;

/** The subset of the Clipboard API used here, so it can be exercised in plain Node. */
export interface ClipboardLike {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

/** The subset of `window` used to retry when the page regains focus. */
export interface FocusTargetLike {
  addEventListener(type: "focus", listener: () => void): void;
  removeEventListener(type: "focus", listener: () => void): void;
}

export type ClearResult = "cleared" | "changed" | "unverifiable";

let pendingTimer: ReturnType<typeof setTimeout> | undefined;
let cancelPendingRetry: (() => void) | undefined;

function cancelPending(): void {
  if (pendingTimer !== undefined) clearTimeout(pendingTimer);
  pendingTimer = undefined;
  cancelPendingRetry?.();
  cancelPendingRetry = undefined;
}

const MAX_CLEAR_ATTEMPTS = 3;

/**
 * Schedules the clipboard clear. A newer call replaces the pending one. The clipboard can only be
 * read while the page has focus, and a minute after copying the user has usually switched to the
 * application they pasted into: when the content cannot be verified the clear is tried again the
 * next time the page gets focus (AW-2026-124). A clear that cannot verify the content never
 * overwrites it.
 */
export function scheduleClipboardClear(
  copied: string,
  clipboard: ClipboardLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.clipboard,
  delayMs: number = CLIPBOARD_CLEAR_DELAY_MS,
  focusTarget: FocusTargetLike | undefined = typeof window === "undefined" ? undefined : window,
): void {
  if (!clipboard || !copied) return;
  cancelPending();
  let attempts = 0;
  const attempt = async (): Promise<void> => {
    attempts++;
    const result = await tryClear(copied, clipboard);
    // A read that stays denied is not retried for the whole session.
    if (result !== "unverifiable" || !focusTarget || attempts >= MAX_CLEAR_ATTEMPTS) return;
    const retry = () => {
      focusTarget.removeEventListener("focus", retry);
      cancelPendingRetry = undefined;
      void attempt();
    };
    focusTarget.addEventListener("focus", retry);
    cancelPendingRetry = () => focusTarget.removeEventListener("focus", retry);
  };
  pendingTimer = setTimeout(() => {
    pendingTimer = undefined;
    void attempt();
  }, delayMs);
}

/** Clears the clipboard when it still holds `copied`, and says what happened. */
export async function tryClear(copied: string, clipboard: ClipboardLike): Promise<ClearResult> {
  try {
    if ((await clipboard.readText()) !== copied) return "changed";
    await clipboard.writeText("");
    return "cleared";
  } catch {
    return "unverifiable";
  }
}

/** Clears the clipboard when it still holds `copied`; resolves to whether it was cleared. */
export async function clearIfUnchanged(
  copied: string,
  clipboard: ClipboardLike,
): Promise<boolean> {
  return (await tryClear(copied, clipboard)) === "cleared";
}
