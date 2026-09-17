import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import { createTestWallet } from "../support/wallet";
import type { LiquidOpenParams } from "../../src/shared/liquid";
import type { Store } from "vuex";
import type { Router } from "vue-router";
import type { RootState } from "../../src/store";

type WalletElement = HTMLElement & {
  __vue_app__: {
    config: { globalProperties: { $store: Store<RootState>; $router: Router } };
  };
};

const origin = "https://liquid.example";
const requestIds = ["saved-pairing-1", "saved-pairing-2"];

for (const expired of [false, true]) {
  test(`Liquid Auth negotiates when the dApp rejoins after the initial offer ${expired ? "timed out" : "was missed"}`, async ({
    page,
  }) => {
    if (expired) await page.clock.install();
    await page.route("**/*socket*io*client*.js*", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `
        const signals = globalThis.liquidTestSignals ??= {
          listeners: new Map(), offers: [], candidates: []
        };
        const { listeners } = signals;
        export const offers = signals.offers;
        export const candidates = signals.candidates;
        export const receive = (event, payload) => listeners.get(event)?.(payload);
        export const io = () => ({
          connected: true,
          on(event, handler) { listeners.set(event, handler); },
          emit(event, payload) {
            if (event === "offer-description") offers.push(payload);
            if (event === "offer-candidate") candidates.push(payload);
          },
          removeAllListeners() { listeners.clear(); },
          disconnect() {},
        });
      `,
      }),
    );
    await page.goto("/new-wallet");
    const recovery = page.evaluate(async (expired) => {
      const peersPath = "/src/shared/liquid.ts";
      const socketPath = "/node_modules/.vite/deps/socket__io-client.js";
      const { LiquidPeerManager } = (await import(
        peersPath
      )) as typeof import("../../src/shared/liquid");
      const socket = (await import(socketPath)) as {
        offers: string[];
        candidates: RTCIceCandidateInit[];
        receive: (
          event: string,
          payload:
            | string
            | RTCIceCandidateInit
            | {
                requestId: string;
                deviceCount: number;
                online: boolean;
              },
        ) => void;
      };
      const manager = new LiquidPeerManager();
      const statuses: string[] = [];
      const messages: string[] = [];
      await manager.open({
        requestId: "rejoining-dapp",
        origin: "https://liquid.example",
        iceServers: [],
        onStatus: (_, status) => statuses.push(status),
        onMessage: (_, payload) => messages.push(payload),
      });
      const waitUntil = async (phase: string, predicate: () => boolean) => {
        const deadline = Date.now() + 5000;
        while (!predicate()) {
          if (Date.now() > deadline)
            throw new Error(
              `Timed out waiting for ${phase}: ${statuses.join(", ")}; offers=${socket.offers.length}`,
            );
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        }
      };
      const answerer = new RTCPeerConnection({ iceServers: [] });
      try {
        await waitUntil(
          "initial offer and ICE",
          () => socket.offers.length === 1 && socket.candidates.length > 0,
        );
        if (expired) {
          await waitUntil("negotiation timeout", () =>
            statuses.includes("disconnected"),
          );
        }
        socket.receive("presence", {
          requestId: "rejoining-dapp",
          deviceCount: 2,
          online: true,
        });
        await waitUntil("resent offer", () => socket.offers.length === 2);
        answerer.onicecandidate = (event) => {
          if (event.candidate)
            socket.receive("answer-candidate", event.candidate.toJSON());
        };
        answerer.ondatachannel = ({ channel }) => {
          channel.onopen = () => channel.send("signing-request-after-refresh");
        };
        await answerer.setRemoteDescription({
          type: "offer",
          sdp: socket.offers[1],
        });
        if (expired) {
          await waitUntil(
            "new ICE candidates",
            () => socket.candidates.length > 1,
          );
          for (const candidate of socket.candidates) {
            await answerer.addIceCandidate(candidate).catch(() => undefined);
          }
        }
        await answerer.setLocalDescription(await answerer.createAnswer());
        socket.receive("answer-description", answerer.localDescription!.sdp);
        await waitUntil("data channel message", () => messages.length === 1);
        return { statuses, messages };
      } finally {
        manager.closeAll();
        answerer.close();
      }
    }, expired);
    if (expired) {
      await page.waitForFunction(() => {
        const signals = (
          globalThis as typeof globalThis & {
            liquidTestSignals?: {
              offers: string[];
              candidates: RTCIceCandidateInit[];
            };
          }
        ).liquidTestSignals;
        return signals?.offers.length === 1 && signals.candidates.length > 0;
      });
      await page.clock.fastForward(30_001);
    }
    const result = await recovery;
    expect(result.statuses).toContain("connected");
    if (expired) expect(result.statuses).toContain("disconnected");
    expect(result.messages).toEqual(["signing-request-after-refresh"]);
  });
}

test("Liquid Auth stays offline until initialized and restores saved signing sessions after refresh", async ({
  page,
}) => {
  const account = algosdk.generateAccount();
  const address = account.addr.toString();
  const authRequests: string[] = [];
  let failFirstPairing = false;

  await page.route(/\/src\/shared\/liquid\.ts(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
        export const opened = globalThis.liquidTestOpened ??= new Map();
        const peers = {
          async open(params) {
            opened.set(params.requestId, params);
            params.onStatus(params.requestId, "connected");
          },
          isChannelOpen(id) { return opened.has(id); },
          close(id) { opened.delete(id); },
          closeAll() { opened.clear(); },
          send() {}
        };
        export default peers;
      `,
    }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator.credentials, "get", {
      value: async () => ({
        id: "test-credential",
        rawId: new Uint8Array([1]).buffer,
        type: "public-key",
        response: {
          clientDataJSON: new Uint8Array([1]).buffer,
          authenticatorData: new Uint8Array([1]).buffer,
          signature: new Uint8Array([1]).buffer,
          userHandle: null,
        },
      }),
    });
  });
  await page.route(`${origin}/**`, async (route) => {
    authRequests.push(route.request().url());
    const response = route.request().url().endsWith("/assertion/response");
    const pairingId = response
      ? route.request().postDataJSON().clientExtensionResults.liquid.requestId
      : "";
    await route.fulfill({
      status: failFirstPairing && pairingId === requestIds[0] ? 500 : 200,
      json: response
        ? { wallet: address, credentials: [] }
        : { challenge: "AQ", allowCredentials: [] },
    });
  });

  await page.goto("/new-wallet");
  await createTestWallet(page, "Liquid Test Wallet");
  await page.waitForURL(/\/account\//);
  await page.evaluate(
    async ({ mnemonic, address, origin, requestIds }) => {
      const { $store: store, $router: router } = (
        document.querySelector("#app") as WalletElement
      ).__vue_app__.config.globalProperties;
      await store.dispatch("wallet/addPrivateAccount", {
        mn: mnemonic,
        name: "Liquid Account",
      });
      await store.dispatch("wallet/wcSetItem", {
        key: `liquid:cred:${origin}:${address}`,
        value: "test-credential",
      });
      await store.dispatch("wallet/wcSetItem", {
        key: "liquid:sessions",
        value: requestIds.map((requestId) => ({
          requestId,
          origin,
          address,
          device: "Test",
          createdAt: Date.now(),
        })),
      });
      await router.push("/connect");
    },
    {
      mnemonic: algosdk.secretKeyToMnemonic(account.sk),
      address,
      origin,
      requestIds,
    },
  );

  await page.getByRole("tab", { name: "Liquid Auth" }).click();
  await expect(page.locator("#uriLiquid")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Initialize Liquid Auth", exact: true }),
  ).toBeVisible();
  expect(authRequests).toEqual([]);

  const blocked = await page.evaluate(async () => {
    const { $store: store } = (document.querySelector("#app") as WalletElement)
      .__vue_app__.config.globalProperties;
    return Promise.all(
      ["connect", "reconnect"].map(async (action) => {
        try {
          await store.dispatch(`liquid/${action}`, {
            uri: "invalid",
            address: "",
          });
          return false;
        } catch {
          return true;
        }
      }),
    );
  });
  expect(blocked).toEqual([true, true]);
  expect(authRequests).toEqual([]);

  await page
    .getByRole("button", { name: "Initialize Liquid Auth", exact: true })
    .click();
  await expect(page.getByText("Connected", { exact: true })).toHaveCount(2);
  expect(authRequests).toHaveLength(4);

  await page.reload();
  await page.locator("#wallet-pass").fill("TestPassword123");
  await page.locator("#new_wallet_button_open").click();
  await page
    .getByRole("menuitem", { name: "Connect App", exact: true })
    .click();
  await page.getByRole("tab", { name: "Liquid Auth" }).click();
  await expect(page.locator("#uriLiquid")).toBeHidden();
  expect(authRequests).toHaveLength(4);

  failFirstPairing = true;
  await page
    .getByRole("button", { name: "Initialize Liquid Auth", exact: true })
    .click();
  await expect(page.getByText("Connected", { exact: true })).toHaveCount(1);
  await expect(
    page.getByText("Waiting for the dApp", { exact: true }),
  ).toHaveCount(1);
  expect(authRequests).toHaveLength(8);

  failFirstPairing = false;
  await page
    .getByRole("button", { name: "Initialize Liquid Auth", exact: true })
    .click();
  await expect(page.getByText("Connected", { exact: true })).toHaveCount(2);
  expect(authRequests).toHaveLength(10);

  const transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: address,
    receiver: address,
    amount: 0,
    suggestedParams: {
      fee: 1000,
      flatFee: true,
      firstValid: 1,
      lastValid: 100,
    },
  });
  await page.evaluate(
    async ({ requestId, txn }) => {
      const peersPath = "/src/shared/liquid.ts";
      const protocolPath = "/src/scripts/liquid/protocol.ts";
      const { opened } = (await import(peersPath)) as {
        opened: Map<string, LiquidOpenParams>;
      };
      const { encodeLiquidMessage, LiquidReference } = (await import(
        protocolPath
      )) as typeof import("../../src/scripts/liquid/protocol");
      const peer = opened.get(requestId);
      if (!peer) throw new Error("Saved peer was not reopened");
      peer.onMessage(
        requestId,
        await encodeLiquidMessage({
          id: "after-refresh",
          reference: LiquidReference.signTransactionsRequest,
          params: { providerId: "test-dapp", txns: [{ txn }] },
        }),
      );
    },
    {
      requestId: requestIds[0],
      txn: Buffer.from(transaction.toByte()).toString("base64"),
    },
  );

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { $store: store } = (
          document.querySelector("#app") as WalletElement
        ).__vue_app__.config.globalProperties;
        return store.state.liquid.requests.map((request) => request.id);
      }),
    )
    .toEqual(["after-refresh"]);

  const resetState = await page.evaluate(async () => {
    const { $store: store } = (document.querySelector("#app") as WalletElement)
      .__vue_app__.config.globalProperties;
    await store.dispatch("liquid/reset");
    return store.state.liquid;
  });
  expect(resetState).toEqual({
    enabled: false,
    sessions: [],
    requests: [],
    signDataRequests: [],
  });
});
