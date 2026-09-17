/**
 * Runtime side of the wallet's Liquid Auth sessions: the signaling socket, the WebRTC peer
 * connection and the data channel per pairing. Lives outside Vuex because none of it is
 * serializable; src/store/liquid.ts keeps the user-facing session records and requests.
 *
 * The wallet is the **offer** peer (Liquid Auth convention): after the passkey ceremony it
 * connects its signaling socket (which reuses the service's session cookie), creates the
 * `liquid` data channel, sends `offer-description` / `offer-candidate` into the requestId room
 * and waits for the dApp's `answer-description` / `answer-candidate`. The service broadcasts a
 * `presence` event whenever a peer joins or leaves the room; when both peers are present but
 * the channel is down (e.g. the dApp reloaded) the wallet renegotiates.
 */
import type { Socket } from "socket.io-client";
import { DEFAULT_ICE_SERVERS } from "../scripts/liquid/protocol";

export type LiquidRuntimeStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "closed";

export interface LiquidOpenParams {
  requestId: string;
  origin: string;
  iceServers?: RTCIceServer[];
  onMessage: (requestId: string, payload: string) => void;
  onStatus: (requestId: string, status: LiquidRuntimeStatus) => void;
}

interface RuntimeSession {
  requestId: string;
  origin: string;
  iceServers: RTCIceServer[];
  socket: Socket;
  peerConnection: RTCPeerConnection | null;
  channel: RTCDataChannel | null;
  pendingCandidates: RTCIceCandidateInit[];
  negotiating: boolean;
  negotiationTimeout?: ReturnType<typeof setTimeout>;
  closed: boolean;
  onMessage: LiquidOpenParams["onMessage"];
  onStatus: LiquidOpenParams["onStatus"];
}

const ANSWER_TIMEOUT_MS = 30_000;

export class LiquidPeerManager {
  private readonly sessions = new Map<string, RuntimeSession>();

  has(requestId: string): boolean {
    return this.sessions.has(requestId);
  }

  isChannelOpen(requestId: string): boolean {
    return this.sessions.get(requestId)?.channel?.readyState === "open";
  }

  /**
   * Connect the signaling socket for an already-authenticated pairing and start negotiating.
   * Resolves once the socket is connected; the data channel opens asynchronously and is
   * reported through `onStatus`.
   */
  async open(params: LiquidOpenParams): Promise<void> {
    this.close(params.requestId);
    const { io } = await import("socket.io-client");
    const socket = io(params.origin.replace(/\/+$/, ""), {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
    });
    const session: RuntimeSession = {
      requestId: params.requestId,
      origin: params.origin,
      iceServers: params.iceServers ?? DEFAULT_ICE_SERVERS,
      socket,
      peerConnection: null,
      channel: null,
      pendingCandidates: [],
      negotiating: false,
      closed: false,
      onMessage: params.onMessage,
      onStatus: params.onStatus,
    };
    this.sessions.set(params.requestId, session);
    session.onStatus(params.requestId, "connecting");

    socket.on("answer-description", (sdp: string) => {
      void this.handleAnswer(session, sdp);
    });
    socket.on("answer-candidate", (candidate: RTCIceCandidateInit) => {
      void this.handleAnswerCandidate(session, candidate);
    });
    socket.on(
      "presence",
      (presence: { requestId: string; deviceCount: number; online: boolean }) => {
        if (presence.requestId !== session.requestId) return;
        if (
          presence.deviceCount >= 2 &&
          session.channel?.readyState !== "open"
        ) {
          void this.negotiate(session);
        }
      }
    );
    socket.on("disconnect", () => {
      if (!session.closed) session.onStatus(session.requestId, "disconnected");
    });

    await new Promise<void>((resolve, reject) => {
      if (socket.connected) return resolve();
      const onError = (error: Error) => {
        socket.off("connect", onConnect);
        reject(new Error(`Cannot reach Liquid Auth service: ${error.message}`));
      };
      const onConnect = () => {
        socket.off("connect_error", onError);
        resolve();
      };
      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
    });
    // The dApp has been waiting in the requestId room since it showed the QR code.
    void this.negotiate(session);
  }

  send(requestId: string, payload: string): void {
    const session = this.sessions.get(requestId);
    if (!session?.channel || session.channel.readyState !== "open") {
      throw new Error("Liquid Auth data channel is not open");
    }
    session.channel.send(payload);
  }

  close(requestId: string): void {
    const session = this.sessions.get(requestId);
    if (!session) return;
    session.closed = true;
    this.sessions.delete(requestId);
    this.teardownPeer(session);
    session.socket.removeAllListeners();
    session.socket.disconnect();
    session.onStatus(requestId, "closed");
  }

  closeAll(): void {
    for (const requestId of [...this.sessions.keys()]) {
      this.close(requestId);
    }
  }

  private teardownPeer(session: RuntimeSession): void {
    clearTimeout(session.negotiationTimeout);
    session.negotiationTimeout = undefined;
    const { channel, peerConnection } = session;
    session.channel = null;
    session.peerConnection = null;
    session.pendingCandidates = [];
    if (channel) {
      channel.onopen = null;
      channel.onclose = null;
      channel.onmessage = null;
      try {
        channel.close();
      } catch {
        /* ignore */
      }
    }
    if (peerConnection) {
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      try {
        peerConnection.close();
      } catch {
        /* ignore */
      }
    }
  }

  private async negotiate(session: RuntimeSession): Promise<void> {
    if (session.closed) return;
    if (session.negotiating) {
      const peerConnection = session.peerConnection;
      const offer = peerConnection?.localDescription;
      if (offer?.type === "offer" && !peerConnection?.remoteDescription) {
        session.socket.emit("offer-description", offer.sdp);
      }
      return;
    }
    session.negotiating = true;
    session.onStatus(session.requestId, "connecting");
    try {
      this.teardownPeer(session);
      const peerConnection = new RTCPeerConnection({
        iceServers: session.iceServers,
        iceCandidatePoolSize: 10,
      });
      session.peerConnection = peerConnection;
      const channel = peerConnection.createDataChannel("liquid");
      session.channel = channel;

      channel.onopen = () => {
        clearTimeout(session.negotiationTimeout);
        session.negotiationTimeout = undefined;
        session.negotiating = false;
        session.onStatus(session.requestId, "connected");
      };
      channel.onclose = () => {
        if (session.channel === channel && !session.closed) {
          session.negotiating = false;
          session.onStatus(session.requestId, "disconnected");
        }
      };
      channel.onmessage = (event: MessageEvent) => {
        session.onMessage(session.requestId, String(event.data));
      };
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          session.socket.emit("offer-candidate", event.candidate.toJSON());
        }
      };
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (
          session.peerConnection === peerConnection &&
          !session.closed &&
          (state === "failed" || state === "disconnected" || state === "closed")
        ) {
          session.negotiating = false;
          session.onStatus(session.requestId, "disconnected");
        }
      };

      const offer = await peerConnection.createOffer();
      if (session.closed || session.peerConnection !== peerConnection) return;
      await peerConnection.setLocalDescription(offer);
      if (session.closed || session.peerConnection !== peerConnection) return;
      session.socket.emit("offer-description", offer.sdp);

      session.negotiationTimeout = setTimeout(() => {
        if (session.peerConnection === peerConnection && channel.readyState !== "open") {
          this.teardownPeer(session);
          session.negotiating = false;
          session.onStatus(session.requestId, "disconnected");
        }
      }, ANSWER_TIMEOUT_MS);
    } catch (error) {
      if (session.closed) return;
      this.teardownPeer(session);
      session.negotiating = false;
      session.onStatus(session.requestId, "disconnected");
      console.error("Liquid Auth negotiation failed", error);
    }
  }

  private async handleAnswer(session: RuntimeSession, sdp: string): Promise<void> {
    const peerConnection = session.peerConnection;
    if (!peerConnection || peerConnection.remoteDescription) return;
    try {
      await peerConnection.setRemoteDescription({ type: "answer", sdp });
      for (const candidate of session.pendingCandidates.splice(0)) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
      }
    } catch (error) {
      session.negotiating = false;
      console.error("Liquid Auth answer rejected", error);
    }
  }

  private async handleAnswerCandidate(
    session: RuntimeSession,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peerConnection = session.peerConnection;
    if (!peerConnection) return;
    if (peerConnection.remoteDescription) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
    } else {
      session.pendingCandidates.push(candidate);
    }
  }
}

export const liquidPeers = new LiquidPeerManager();

export default liquidPeers;
