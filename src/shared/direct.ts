/**
 * Biatec Direct runtime (wallet popup side). Lives outside Vuex because it owns browser objects
 * (`window.opener`, the `message` listener, timers) — same split as `src/shared/liquid.ts`.
 *
 * Security rules enforced here (see docs/DIRECT.md):
 *  - runs only as a top-level popup (`window.top === window`) that has an opener;
 *  - the dApp origin comes from the `origin` URL hint and every inbound message must carry
 *    exactly that `event.origin` AND come from `window.opener`, otherwise it is ignored
 *    without any reply;
 *  - every outbound message uses that origin as `targetOrigin` (never `"*"`);
 *  - exactly one request is accepted, within a short window after `ready` (DirectRequestGate);
 *  - an unanswered request is answered with a user-rejection error when the popup goes away.
 */
import {
  DIRECT_ACCEPT_WINDOW_MS,
  DIRECT_CLOSE_DELAY_MS,
  DIRECT_METHODS,
  DIRECT_PROTOCOL_VERSION,
  DIRECT_READY_REFERENCE,
  DirectErrorCode,
  DirectRequestGate,
  buildDirectError,
  parseOriginHint,
  parseRequestEnvelope,
  responseReference,
  type DirectReadyMessage,
  type DirectRequestMessage,
  type DirectResponseMessage,
} from "../scripts/direct/protocol";

export type DirectStartResult =
  | { ok: true; dappOrigin: string }
  | { ok: false; error: "framed" | "no_opener" | "bad_origin" | "consumed" };

/**
 * A popup serves exactly one channel for its whole lifetime: a lock/unlock cycle or a reload
 * must not announce `ready` again (a dApp could push further requests through the same popup).
 * sessionStorage survives a reload but is not shared with other windows.
 */
const CONSUMED_KEY = "direct:channel-consumed";
const isConsumed = (): boolean => {
  try {
    return window.sessionStorage.getItem(CONSUMED_KEY) === "1";
  } catch {
    return false;
  }
};
const markConsumed = (): void => {
  try {
    window.sessionStorage.setItem(CONSUMED_KEY, "1");
  } catch {
    // Storage unavailable: the in-page `used` flag below still covers lock/unlock cycles.
  }
};
let usedInThisPage = false;

export interface DirectChannelHandlers {
  onRequest: (request: DirectRequestMessage, dappOrigin: string) => void;
  /** The window cannot continue (opener closed, accept window expired without a request). */
  onExpired: () => void;
}

const OPENER_POLL_MS = 1000;

class DirectChannel {
  private opener: Window | null = null;
  private gate: DirectRequestGate | null = null;
  private handlers: DirectChannelHandlers | null = null;
  private listener: ((event: MessageEvent) => void) | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRequest: DirectRequestMessage | null = null;
  private pagehideListener: (() => void) | null = null;

  get dappOrigin(): string | undefined {
    return this.gate?.dappOrigin;
  }

  /** Begin listening. Posts `ready` to the opener (only ever to the hinted origin). */
  start(handlers: DirectChannelHandlers): DirectStartResult {
    this.stop();
    if (window.top !== window.self) {
      return { ok: false, error: "framed" };
    }
    if (usedInThisPage || isConsumed()) {
      return { ok: false, error: "consumed" };
    }
    const opener = window.opener as Window | null;
    if (!opener || opener.closed) {
      return { ok: false, error: "no_opener" };
    }
    const dappOrigin = parseOriginHint(window.location.search);
    if (!dappOrigin) {
      return { ok: false, error: "bad_origin" };
    }
    usedInThisPage = true;
    markConsumed();
    this.opener = opener;
    this.handlers = handlers;
    this.gate = new DirectRequestGate(dappOrigin);

    this.listener = (event: MessageEvent) => this.onMessage(event);
    window.addEventListener("message", this.listener);
    this.pagehideListener = () => this.rejectPending("Wallet window was closed.");
    window.addEventListener("pagehide", this.pagehideListener);
    this.pollTimer = setInterval(() => {
      if (this.opener?.closed) {
        this.rejectPending("The requesting site was closed.");
        this.handlers?.onExpired();
        this.stop();
        window.close();
      }
    }, OPENER_POLL_MS);

    const ready: DirectReadyMessage = {
      v: DIRECT_PROTOCOL_VERSION,
      reference: DIRECT_READY_REFERENCE,
      capabilities: { methods: [...DIRECT_METHODS], genesisHashes: [] },
    };
    this.gate.markReady(Date.now());
    this.postToOpener(ready);
    // If nothing arrives within the accept window the popup is useless: tell the user.
    this.expiryTimer = setTimeout(() => {
      if (!this.gate?.hasAcceptedRequest) {
        this.handlers?.onExpired();
      }
    }, DIRECT_ACCEPT_WINDOW_MS + 1000);
    return { ok: true, dappOrigin };
  }

  private onMessage(event: MessageEvent): void {
    const gate = this.gate;
    if (!gate || !this.opener) return;
    // Anything that is not from the hinted origin AND the opener is ignored without a reply.
    if (event.origin !== gate.dappOrigin || event.source !== this.opener) {
      return;
    }
    const envelope = parseRequestEnvelope(event.data);
    if (!envelope) return;
    const decision = gate.admit({
      origin: event.origin,
      fromOpener: event.source === this.opener,
      now: Date.now(),
    });
    if (!decision.ok) {
      if (!decision.silent) {
        this.send(
          buildDirectError(envelope.id, responseReference(envelope.reference), {
            code: DirectErrorCode.invalidInput,
            message: decision.reason,
          }),
        );
      }
      return;
    }
    this.pendingRequest = envelope;
    this.handlers?.onRequest(envelope, gate.dappOrigin);
  }

  /** Reply to the dApp. A reply that answers the accepted request ends the request. */
  send(message: DirectResponseMessage): void {
    if (this.pendingRequest && message.requestId === this.pendingRequest.id) {
      this.pendingRequest = null;
    }
    this.postToOpener(message);
  }

  /** Answer the accepted request (if still unanswered) with an error. */
  rejectPending(reason: string, code: number = DirectErrorCode.cancelled): void {
    const request = this.pendingRequest;
    if (!request) return;
    this.send(
      buildDirectError(request.id, responseReference(request.reference), {
        code,
        message: reason,
      }),
    );
  }

  /** Close the popup once the response had a moment to be delivered. */
  closeAfterFlush(): void {
    setTimeout(() => {
      this.stop();
      window.close();
    }, DIRECT_CLOSE_DELAY_MS);
  }

  stop(): void {
    if (this.listener) window.removeEventListener("message", this.listener);
    if (this.pagehideListener) {
      window.removeEventListener("pagehide", this.pagehideListener);
    }
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.listener = null;
    this.pagehideListener = null;
    this.pollTimer = null;
    this.expiryTimer = null;
    this.opener = null;
    this.gate = null;
    this.handlers = null;
    this.pendingRequest = null;
  }

  private postToOpener(message: object): void {
    const origin = this.gate?.dappOrigin;
    if (!this.opener || this.opener.closed || !origin) return;
    try {
      this.opener.postMessage(message, origin);
    } catch (error) {
      console.error("Failed to post message to the requesting site", error);
    }
  }
}

export const directChannel = new DirectChannel();
export default directChannel;
