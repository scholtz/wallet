// Shared helpers for the Biatec Direct popup E2E specs: a fixture "dApp" page on a different
// origin than the wallet (127.0.0.1 vs localhost, same dev server) plus request builders.
import { expect, type BrowserContext, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { createHash, createPublicKey, verify } from "node:crypto";
import { DEFAULT_WALLET_PASSWORD } from "./wallet";
export const WALLET_ORIGIN = "http://localhost:8080";
export const DAPP_ORIGIN = "http://127.0.0.1:8080";
export const DAPP_URL = `${DAPP_ORIGIN}/__direct-dapp.html`;
export const MAINNET_HASH = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
export const TESTNET_HASH = "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
export const VOI_HASH = "r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=";
export const WALLET_PROVIDER_ID = "8f7a1c2e-5b3d-4e9f-a6c0-1d2e3f4a5b6c";
export const OTHER_ADDR = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

export const FIXTURE = `<!doctype html><html><body><button id="open">open</button><script>
const WALLET = ${JSON.stringify(WALLET_ORIGIN)};
window.__messages = [];
window.__popup = null;
window.addEventListener("message", (e) => {
  window.__messages.push({ origin: e.origin, data: e.data, fromPopup: e.source === window.__popup });
});
window.__hint = location.origin;
window.__lang = "";
document.getElementById("open").addEventListener("click", () => {
  window.__popup = window.open(WALLET + "/direct?origin=" + encodeURIComponent(window.__hint) +
    (window.__lang ? "&lang=" + encodeURIComponent(window.__lang) : ""),
    "biatec-wallet-direct", "popup,width=480,height=720");
});
window.__post = (msg) => window.__popup.postMessage(msg, WALLET);
window.__closePopup = () => window.__popup.close();
</script></body></html>`;

export async function openDapp(context: BrowserContext): Promise<Page> {
  await context.route(DAPP_URL, (route) =>
    route.fulfill({ contentType: "text/html", body: FIXTURE }),
  );
  const dapp = await context.newPage();
  await dapp.goto(DAPP_URL);
  return dapp;
}

export async function openPopup(context: BrowserContext, dapp: Page): Promise<Page> {
  // Messages of a previous popup (e.g. its `ready`) must not satisfy waits for this one.
  await dapp.evaluate(() => {
    (window as unknown as { __messages: unknown[] }).__messages.length = 0;
  });
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    dapp.locator("#open").click(),
  ]);
  return popup;
}

export async function unlock(popup: Page) {
  // A fresh popup loads the whole app: allow for a busy machine or CI runner.
  await expect(popup.locator("#new_wallet_button_open")).toBeVisible({ timeout: 60000 });
  await popup.locator("#wallet-pass").fill(DEFAULT_WALLET_PASSWORD);
  await popup.locator("#new_wallet_button_open").click();
}

/** The popup closes itself shortly after replying; poll instead of racing a close event. */
export const expectClosed = (popup: Page) => expect.poll(() => popup.isClosed()).toBe(true);

export type Msg = { origin: string; data: Record<string, unknown>; fromPopup: boolean };
export const messages = (dapp: Page) => dapp.evaluate(() => (window as unknown as { __messages: Msg[] }).__messages);
export const post = (dapp: Page, msg: unknown) =>
  dapp.evaluate((m) => (window as unknown as { __post: (x: unknown) => void }).__post(m), msg);

export async function waitForMessage(dapp: Page, predicate: (m: Msg) => boolean): Promise<Msg> {
  let found: Msg | undefined;
  await expect
    .poll(async () => {
      found = (await messages(dapp)).find(predicate);
      return Boolean(found);
    })
    .toBe(true);
  return found!;
}

export const isReady = (m: Msg) => m.data.reference === "biatec:direct:ready";
export const reply = (id: string) => (m: Msg) => m.data.requestId === id;

/** ARC-60 AUTH item for `domain`, signed by `signerAddr` (authenticatorData = SHA-256(domain)). */
export function arc60Item(signerAddr: string, domain: string) {
  return {
    data: Buffer.from('{"type":"auth","nonce":"1"}').toString("base64"),
    signer: Buffer.from(algosdk.decodeAddress(signerAddr).publicKey).toString("base64"),
    domain,
    authenticatorData: createHash("sha256").update(domain).digest().toString("base64"),
    scope: 1,
    encoding: "base64",
  };
}

/** Account address of the freshly created wallet (from /account/<addr>). */
export const walletAddress = (page: Page) => new URL(page.url()).pathname.split("/").pop()!;

export function paymentTxn(sender: string, genesisHash = MAINNET_HASH, genesisID = "mainnet-v1.0") {
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount: 0,
    suggestedParams: {
      fee: 1000,
      flatFee: true,
      firstValid: 1000,
      lastValid: 2000,
      genesisHash: new Uint8Array(Buffer.from(genesisHash, "base64")),
      genesisID,
    },
  });
  return {
    txn,
    b64url: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64url"),
  };
}

/** Suggested params of a Testnet transaction. */
export const testnetParams = () => ({
  fee: 1000,
  flatFee: true,
  firstValid: 1000,
  lastValid: 2000,
  genesisHash: new Uint8Array(Buffer.from(TESTNET_HASH, "base64")),
  genesisID: "testnet-v1.0",
});

export const encode = (txn: algosdk.Transaction) => ({
  txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64url"),
});

/** The returned stxn is for `txn` and carries a valid ed25519 signature of `address`. */
export function expectValidSignature(stxn: string, txn: algosdk.Transaction, address: string) {
  const signed = algosdk.decodeSignedTransaction(new Uint8Array(Buffer.from(stxn, "base64url")));
  expect(signed.txn.txID()).toBe(txn.txID());
  const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
  const key = createPublicKey({
    key: Buffer.concat([spkiPrefix, Buffer.from(algosdk.decodeAddress(address).publicKey)]),
    format: "der",
    type: "spki",
  });
  expect(verify(null, Buffer.from(txn.bytesToSign()), key, Buffer.from(signed.sig!))).toBe(true);
}

/** Run the connect (enable) flow for the wallet's account; returns the dApp page. */
export async function connectSite(context: BrowserContext, address: string): Promise<Page> {
  const dapp = await openDapp(context);
  const popup = await openPopup(context, dapp);
  await unlock(popup);
  await expect(popup.getByTestId("direct-origin")).toHaveText(DAPP_ORIGIN);
  await waitForMessage(dapp, isReady);
  await post(dapp, {
    id: "enable-1",
    reference: "arc0027:enable:request",
    params: { providerId: "dapp", genesisHash: MAINNET_HASH, metadata: { name: "Fixture dApp", description: "", url: "", icons: [] } },
  });
  await popup.getByTestId("direct-approve").click();
  const response = await waitForMessage(dapp, reply("enable-1"));
  expect(response.data.error).toBeUndefined();
  expect((response.data.result as { accounts: { address: string }[] }).accounts[0].address).toBe(address);
  await expectClosed(popup);
  return dapp;
}

/** The request list starts collapsed (like WalletConnect's): open the request and every transaction row. */
export async function expandAll(popup: Page) {
  const toggles = popup.locator(".p-datatable-row-toggle-button");
  for (let pass = 0; pass < 3; pass += 1) {
    const count = await toggles.count();
    for (let i = 0; i < count; i += 1) {
      const toggle = toggles.nth(i);
      if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
    }
  }
}
