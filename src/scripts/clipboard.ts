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

let pendingTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Schedules the clipboard clear. A newer call replaces the pending one. Failures (clipboard read
 * not permitted, document not focused) are swallowed: a clear that cannot verify the content
 * must not overwrite it.
 */
export function scheduleClipboardClear(
  copied: string,
  clipboard: ClipboardLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.clipboard,
  delayMs: number = CLIPBOARD_CLEAR_DELAY_MS,
): void {
  if (!clipboard || !copied) return;
  if (pendingTimer !== undefined) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = undefined;
    void clearIfUnchanged(copied, clipboard);
  }, delayMs);
}

/** Clears the clipboard when it still holds `copied`; resolves to whether it was cleared. */
export async function clearIfUnchanged(
  copied: string,
  clipboard: ClipboardLike,
): Promise<boolean> {
  try {
    if ((await clipboard.readText()) !== copied) return false;
    await clipboard.writeText("");
    return true;
  } catch {
    return false;
  }
}
