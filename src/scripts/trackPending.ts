/**
 * Runs `fn` between `onStart` and `onEnd`; `onEnd` always runs, even when `fn` rejects, so a
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
