/**
 * Runs `fn` between `onStart` and `onEnd`; `onEnd` runs even when `fn` rejects (but not when
 * `onStart` itself throws - nothing has started then), so a
 * pending-state indicator (e.g. the "confirm on your Ledger" notice) can never get stuck.
 */
export async function trackPending<T>(
  onStart: () => void,
  onEnd: () => void,
  fn: () => Promise<T>,
): Promise<T> {
  onStart();
  try {
    return await fn();
  } finally {
    onEnd();
  }
}
