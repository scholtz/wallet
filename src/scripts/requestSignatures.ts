/**
 * Transaction ids of dApp requests, so the signatures cached for a request can be dropped when
 * the request leaves the wallet in any way (answered, rejected, session closed) - AW-2026-104/-116.
 * Structural types only: runs in the Node unit tests.
 */
interface RequestLike {
  transactions?: Array<{ txn?: { txID?: () => string } } | undefined> | null;
}

/** The ids of every transaction of the given requests; an undecodable one is skipped. */
export function requestTxIds(requests: Array<RequestLike | undefined | null>): string[] {
  const ids = new Set<string>();
  for (const request of requests) {
    for (const item of request?.transactions ?? []) {
      try {
        const id = item?.txn?.txID?.();
        if (id) ids.add(id);
      } catch {
        // an undecodable transaction has no cached signature to forget
      }
    }
  }
  return Array.from(ids);
}
