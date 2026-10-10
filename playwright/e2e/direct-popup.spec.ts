// Biatec Direct: relay-free popup + postMessage dApp transport (wallet side), end to end.
//
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { createHash } from "node:crypto";
import { DEFAULT_WALLET_PASSWORD, setupFreshWallet } from "../support/wallet";
import {
  WALLET_ORIGIN,
  DAPP_ORIGIN,
  DAPP_URL,
  MAINNET_HASH,
  TESTNET_HASH,
  VOI_HASH,
  WALLET_PROVIDER_ID,
  OTHER_ADDR,
  openDapp,
  openPopup,
  unlock,
  expectClosed,
  Msg,
  messages,
  post,
  waitForMessage,
  isReady,
  reply,
  arc60Item,
  walletAddress,
  paymentTxn,
  testnetParams,
  encode,
  expectValidSignature,
  connectSite,
  expandAll,
} from "../support/direct";

test.describe("Biatec Direct popup transport", () => {
  // Every popup is a separate wallet unlock (PBKDF2); flows with several popups are slow.
  test.describe.configure({ timeout: 240000 });

  test("language: the popup opens in the language the dApp passes in ?lang=", async ({ context, page }) => {
    // The wallet's own preference is English; the dApp (Slovak) wins for this popup only.
    await setupFreshWallet(page);
    await page.evaluate(() => localStorage.setItem("lang", "en"));
    const dapp = await openDapp(context);
    await dapp.evaluate(() => {
      (window as unknown as { __lang: string }).__lang = "sk";
    });
    const popup = await openPopup(context, dapp);
    await expect(popup.getByTestId("direct-unlock-banner")).toContainText("Web chce použiť vašu peňaženku");
    // The user's stored wallet language is not overwritten by the dApp's hint.
    expect(await popup.evaluate(() => localStorage.getItem("lang"))).not.toBe("sk");
  });

  test("language: an unsupported ?lang= keeps the wallet's own language", async ({ context, page }) => {
    await setupFreshWallet(page);
    await page.evaluate(() => localStorage.setItem("lang", "en"));
    const dapp = await openDapp(context);
    await dapp.evaluate(() => {
      (window as unknown as { __lang: string }).__lang = "xx";
    });
    const popup = await openPopup(context, dapp);
    await expect(popup.getByTestId("direct-unlock-banner")).toContainText("A website wants to use your wallet");
  });

  test("connect: the popup shows the browser-verified origin, replies only to it, and closes", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);

    const dapp = await openDapp(context);
    const popup = await openPopup(context, dapp);
    // While still locked the popup already says which site is asking (from the URL hint)...
    await expect(popup.getByTestId("direct-unlock-banner")).toContainText(DAPP_ORIGIN);
    await unlock(popup);
    // The window title stays neutral until the origin is verified.
    await expect(popup).toHaveTitle(/^AWallet$|^Biatec/);
    await expect(popup.getByTestId("direct-origin")).toHaveText(`http://127.0.0.1:8080`);
    // Until a message from that origin was accepted the address is only claimed, not verified.
    await expect(popup.getByText("claimed, not confirmed yet")).toBeVisible();
    // The ready announcement reached the dApp, from the popup, from the wallet origin.
    const ready = await waitForMessage(dapp, isReady);
    expect(ready.origin).toBe(WALLET_ORIGIN);
    expect(ready.fromPopup).toBe(true);
    // 127.0.0.1 is a loopback host: flagged as a development address.
    await expect(popup.getByText("Development address on this computer")).toBeVisible();

    await post(dapp, {
      id: "enable-1",
      reference: "arc0027:enable:request",
      params: { providerId: "dapp", genesisHash: MAINNET_HASH, metadata: { name: "Fixture dApp", description: "", url: "", icons: [] } },
    });
    await expect(popup.getByTestId("direct-approve")).toBeVisible();
    await expect(popup.getByText("verified by your browser")).toBeVisible();
    // ...and then names the verified site in the window title.
    await expect(popup).toHaveTitle(/127\.0\.0\.1:8080/);
    await expect(popup.getByText("claimed, not confirmed yet")).toHaveCount(0);
    await expect(popup.getByTestId(`direct-account-${address}`)).toBeVisible();
    // The approval shows the network by its friendly name, not the raw genesis id.
    await expect(popup.getByTestId("direct-network")).toHaveText("Algorand Mainnet");
    await expect(popup.getByTestId("direct-network-differs")).toHaveCount(0);
    await popup.getByTestId("direct-approve").click();
    const response = await waitForMessage(dapp, reply("enable-1"));
    expect(response.origin).toBe(WALLET_ORIGIN);
    expect(response.data.reference).toBe("arc0027:enable:response");
    expect((response.data.result as { accounts: { address: string }[] }).accounts.map((a) => a.address)).toEqual([address]);
    // Wire contract with the adapter library (biatec-wallet-use-wallet-client): the wallet answers
    // with ITS provider id and a NORMALIZED (base64url, unpadded) genesis hash; the dApp must
    // compare decoded bytes, never strings.
    const result = response.data.result as Record<string, unknown>;
    expect(Object.keys(result).sort()).toEqual(["accounts", "genesisHash", "providerId", "wallet"]);
    // Privacy: the user's account names are never sent to the site.
    expect((result.accounts as Record<string, unknown>[]).every((a) => Object.keys(a).join() === "address")).toBe(true);
    expect(result.providerId).toBe(WALLET_PROVIDER_ID);
    expect(result.genesisHash).toBe("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8");
    expect(Object.keys(response.data).sort()).toEqual(["id", "reference", "requestId", "result"]);
    await expectClosed(popup);

    // A stale main tab (unlocked before the grant existed) re-saving the wallet must not wipe
    // the grant the popup persisted.
    await page.evaluate(() => {
      const app = (document.querySelector("#app") as unknown as {
        __vue_app__: { config: { globalProperties: { $store: { dispatch: (a: string) => Promise<unknown> } } } };
      }).__vue_app__;
      return app.config.globalProperties.$store.dispatch("wallet/saveWallet");
    });
    const persisted = await page.evaluate(() => {
      const app = (document.querySelector("#app") as unknown as {
        __vue_app__: { config: { globalProperties: { $store: { dispatch: (a: string, p: unknown) => Promise<unknown> } } } };
      }).__vue_app__;
      return app.config.globalProperties.$store.dispatch("wallet/wcGetItemFresh", { key: "direct:sessions" });
    });
    expect(JSON.stringify(persisted)).toContain(DAPP_ORIGIN);

    // The main wallet tab (unlocked BEFORE the popup stored the grant) sees the grant on the
    // Connect page's Direct tab and can revoke it. A reload would lock it, so navigate in-app.
    await page.evaluate(() => {
      const app = (document.querySelector("#app") as unknown as {
        __vue_app__: { config: { globalProperties: { $router: { push: (to: string) => void } } } };
      }).__vue_app__;
      app.config.globalProperties.$router.push("/connect");
    });
    await page.getByRole("tab", { name: "Direct (popup)" }).click();
    await expect(page.getByText(DAPP_ORIGIN, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByTestId("direct-no-sessions")).toBeVisible();

    // ...and with the grant revoked, signing is refused again (4100).
    const dapp2 = await openDapp(context);
    const popup2 = await openPopup(context, dapp2);
    await unlock(popup2);
    await waitForMessage(dapp2, isReady);
    await post(dapp2, {
      id: "s-revoked",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [{ txn: paymentTxn(address).b64url }] },
    });
    const refused = await waitForMessage(dapp2, reply("s-revoked"));
    expect((refused.data.error as { code: number }).code).toBe(4100);
  });

  test("reject answers 4001 and closes the popup", async ({ context, page }) => {
    await setupFreshWallet(page);
    const dapp = await openDapp(context);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, { id: "e1", reference: "arc0027:enable:request", params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} } });
    await popup.getByTestId("direct-reject").click();
    const response = await waitForMessage(dapp, reply("e1"));
    expect((response.data.error as { code: number }).code).toBe(4001);
    await expectClosed(popup);
  });

  test("closing the popup with an unanswered request is visible to the dApp (closed handle)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const dapp = await openDapp(context);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, { id: "e1", reference: "arc0027:enable:request", params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} } });
    await expect(popup.getByTestId("direct-approve")).toBeVisible();
    await popup.close();
    await expect
      .poll(() => dapp.evaluate(() => (window as unknown as { __popup: Window }).__popup.closed))
      .toBe(true);
  });

  test("a second request in the same popup is refused with 4200 (one request per popup)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const dapp = await openDapp(context);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, { id: "e1", reference: "arc0027:enable:request", params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} } });
    await expect(popup.getByTestId("direct-approve")).toBeVisible();
    await post(dapp, { id: "e2", reference: "arc0027:enable:request", params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} } });
    const second = await waitForMessage(dapp, reply("e2"));
    expect((second.data.error as { code: number }).code).toBe(4200);
    // The first request is untouched and still pending.
    await expect(popup.getByTestId("direct-approve")).toBeVisible();
  });

  test("a mismatching origin hint: ready is never delivered and the dApp's request is ignored", async ({ context, page }) => {
    await setupFreshWallet(page);
    const dapp = await openDapp(context);
    // The dApp claims a different origin in the hint than the one it really has.
    await dapp.evaluate(() => {
      (window as unknown as { __hint: string }).__hint = "http://localhost:9999";
    });
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await expect(popup.getByTestId("direct-origin")).toHaveText("http://localhost:9999");
    await post(dapp, { id: "e1", reference: "arc0027:enable:request", params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} } });
    await popup.waitForTimeout(1500);
    // Nothing came back (ready went to localhost:9999, the request was dropped without a reply)
    // and no approval UI appeared.
    expect(await messages(dapp)).toHaveLength(0);
    await expect(popup.getByTestId("direct-approve")).toHaveCount(0);
    await expect(popup.getByTestId("direct-waiting")).toBeVisible();
  });

  test("sign: refused without a connected site (4100)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const { b64url } = paymentTxn(address);
    const dapp0 = await openDapp(context);
    const popup0 = await openPopup(context, dapp0);
    await unlock(popup0);
    await waitForMessage(dapp0, isReady);
    await post(dapp0, {
      id: "s0",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [{ txn: b64url }] },
    });
    const refused = await waitForMessage(dapp0, reply("s0"));
    expect((refused.data.error as { code: number }).code).toBe(4100);
    await expectClosed(popup0);
  });

  test("sign: after connecting, signs and returns a valid signature", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const { txn, b64url } = paymentTxn(address);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "s1",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [{ txn: b64url }] },
    });
    await expect(popup.getByRole("button", { name: "Sign transaction" })).toBeVisible();
    // On the wallet's own network the card names it, with no "different network" note, and the
    // wallet-network enrichment (node preview) stays.
    await expect(popup.getByTestId("direct-network")).toHaveText("Algorand Mainnet");
    await expect(popup.getByTestId("direct-network-differs")).toHaveCount(0);
    await expect(popup.getByTestId("direct-network-test")).toHaveCount(0);
    await expect(popup.getByTestId("direct-foreign-note")).toHaveCount(0);
    await expandAll(popup);
    await expect(popup.getByText("Node-reported preview")).toBeVisible();
    // Signing is the approval: the result goes straight back, no second click.
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("s1"));
    expect(response.data.error).toBeUndefined();
    const stxns = (response.data.result as { stxns: (string | null)[] }).stxns;
    expect(stxns).toHaveLength(1);
    const signed = algosdk.decodeSignedTransaction(new Uint8Array(Buffer.from(stxns[0]!, "base64url")));
    expect(signed.txn.txID()).toBe(txn.txID());
    expect(signed.sig).toBeDefined();
    expect(signed.sig!.length).toBe(64);
    await expectClosed(popup);
  });

  test("sign: a sender that is not an approved account is refused (4100)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "s2",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [{ txn: paymentTxn(OTHER_ADDR).b64url }] },
    });
    const response = await waitForMessage(dapp, reply("s2"));
    expect((response.data.error as { code: number }).code).toBe(4100);
    await expectClosed(popup);
  });

  test("sign: a TESTNET request is signed while the wallet is on mainnet; the popup says which network", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    // The site was connected on mainnet; the grant is not bound to a network.
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const sp = testnetParams();
    const pay = algosdk.makePaymentTxnWithSuggestedParamsFromObject({ sender: address, receiver: address, amount: 1_500_000, suggestedParams: sp });
    const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({ sender: address, receiver: address, amount: 5, assetIndex: 31566704, suggestedParams: sp });
    algosdk.assignGroupID([pay, axfer]);
    await post(dapp, {
      id: "t1",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: TESTNET_HASH, txns: [pay, axfer].map(encode) },
    });
    await expect(popup.getByTestId("direct-network")).toHaveText("Algorand Testnet");
    await expect(popup.getByTestId("direct-network-test")).toHaveText("Test network");
    await expect(popup.getByTestId("direct-network-differs")).toContainText("Different from the network selected in the wallet (");
    await expect(popup.getByTestId("direct-network-unknown")).toHaveCount(0);
    await expandAll(popup);
    // Native amounts / fees are in the network's own token; the asset is only its id (no name
    // from another network's indexer, never "Algo").
    await expect(popup.getByText("1.500000 Algo").first()).toBeVisible();
    await expect(popup.getByText("0.001000 Algo").first()).toBeVisible();
    await expect(popup.getByText("5 asset 31566704").first()).toBeVisible();
    // Nothing from the wallet's own network is shown for another network.
    await expect(popup.getByTestId("direct-foreign-note")).toContainText("not shown for another network");
    await expect(popup.getByText("Node-reported preview")).toHaveCount(0);
    // Security-relevant rows stay.
    await expect(popup.getByRole("cell", { name: "Fee:" }).first()).toBeVisible();
    await expect(popup.getByRole("cell", { name: "Genesis ID:" }).first()).toBeVisible();
    await expect(popup.getByText("testnet-v1.0").first()).toBeVisible();
    await popup.getByRole("button", { name: "Sign", exact: true }).first().click();
    await popup.getByRole("button", { name: "Sign", exact: true }).first().click();
    const response = await waitForMessage(dapp, reply("t1"));
    expect(response.data.error).toBeUndefined();
    const stxns = (response.data.result as { stxns: (string | null)[] }).stxns;
    expect(stxns).toHaveLength(2);
    [pay, axfer].forEach((txn, i) => expectValidSignature(stxns[i]!, txn, address));
    await expectClosed(popup);
  });

  test("sign: a Voi mainnet request is signed and amounts are in VOI", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const { txn, b64url } = paymentTxn(address, VOI_HASH, "voimain-v1.0");
    await post(dapp, {
      id: "v1",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: VOI_HASH, txns: [{ txn: b64url }] },
    });
    await expect(popup.getByTestId("direct-network")).toHaveText("Voi Mainnet");
    await expect(popup.getByTestId("direct-network-test")).toHaveCount(0);
    await expandAll(popup);
    await expect(popup.getByText("0.001000 VOI").first()).toBeVisible();
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("v1"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature((response.data.result as { stxns: string[] }).stxns[0], txn, address);
    await expectClosed(popup);
  });

  test("sign: an UNKNOWN network is signed only after the user is warned and shown the genesis hash", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const hash = Buffer.from(algosdk.generateAccount().addr.publicKey).toString("base64");
    const { txn, b64url } = paymentTxn(address, hash, "my-private-net-v1");
    await post(dapp, {
      id: "u1",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: hash, txns: [{ txn: b64url }] },
    });
    await expect(popup.getByTestId("direct-network")).toHaveText("Unknown network");
    await expect(popup.getByTestId("direct-network-unknown")).toContainText("Only continue if you recognise it");
    await expect(popup.getByTestId("direct-network-hash")).toHaveText(hash.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"));
    await expandAll(popup);
    // No token is known: the raw base units are shown, not a guessed scaling.
    await expect(popup.getByText("1,000 units").first()).toBeVisible();
    await expect(popup.getByText("my-private-net-v1").first()).toBeVisible();
    expect((await messages(dapp)).some(reply("u1"))).toBe(false);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("u1"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature((response.data.result as { stxns: string[] }).stxns[0], txn, address);
    await expectClosed(popup);
  });

  test("sign: a request on the network the site was connected on shows no network-change warning (AW-2026-068)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const { b64url } = paymentTxn(address);
    await post(dapp, {
      id: "same-net",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [{ txn: b64url }] },
    });
    await expect(popup.getByTestId("direct-network")).toHaveText("Algorand Mainnet");
    await expect(popup.getByTestId("direct-network-changed")).toHaveCount(0);
  });

  test("sign: an application call on an UNKNOWN network is refused (4200) (AW-2026-069)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const hash = Buffer.from(algosdk.generateAccount().addr.publicKey).toString("base64");
    const appCall = algosdk.makeApplicationNoOpTxnFromObject({
      sender: address,
      appIndex: 1234,
      suggestedParams: {
        fee: 1000,
        flatFee: true,
        firstValid: 1000,
        lastValid: 2000,
        genesisHash: new Uint8Array(Buffer.from(hash, "base64")),
        genesisID: "my-private-net-v1",
      },
    });
    await post(dapp, {
      id: "unk-app",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: hash, txns: [encode(appCall)] },
    });
    const response = await waitForMessage(dapp, reply("unk-app"));
    expect((response.data.error as { code: number }).code).toBe(4200);
    expect((response.data.error as { message: string }).message).toContain("does not recognise");
    await expectClosed(popup);
  });

  test("sign: a request carrying only part of a transaction group is refused (4200) (AW-2026-064)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const first = paymentTxn(address).txn;
    const second = paymentTxn(address).txn;
    second.note = new Uint8Array([1]);
    algosdk.assignGroupID([first, second]);
    await post(dapp, {
      id: "partial",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [encode(first)] },
    });
    const response = await waitForMessage(dapp, reply("partial"));
    expect((response.data.error as { code: number }).code).toBe(4200);
    expect((response.data.error as { message: string }).message).toContain("transaction group");
    await expectClosed(popup);
  });

  test("sign: a transaction whose genesis hash differs from the request's is refused (4200)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    // The request claims mainnet but the transaction is a testnet one.
    await post(dapp, {
      id: "s4",
      reference: "arc0027:sign_transactions:request",
      params: {
        providerId: "d",
        genesisHash: MAINNET_HASH,
        txns: [{ txn: paymentTxn(address, TESTNET_HASH, "testnet-v1.0").b64url }],
      },
    });
    const response = await waitForMessage(dapp, reply("s4"));
    expect((response.data.error as { code: number }).code).toBe(4200);
    expect((response.data.error as { message: string }).message).toContain("different network");
    await expectClosed(popup);
  });

  test("sign: a known network with a contradicting genesis ID is refused (4200)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    // Testnet hash, but the transaction says it is mainnet: the label must not lie.
    await post(dapp, {
      id: "s5",
      reference: "arc0027:sign_transactions:request",
      params: {
        providerId: "d",
        genesisHash: TESTNET_HASH,
        txns: [{ txn: paymentTxn(address, TESTNET_HASH, "mainnet-v1.0").b64url }],
      },
    });
    const response = await waitForMessage(dapp, reply("s5"));
    expect((response.data.error as { code: number }).code).toBe(4200);
    expect((response.data.error as { message: string }).message).toContain("genesis ID");
    await expectClosed(popup);
  });

  test("sign: a hash that only starts like mainnet is an UNKNOWN network, never shown as mainnet", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    // First 24 bytes of mainnet's genesis hash, then junk: the CAIP-2 prefix matches, the hash does not.
    const spoof = Buffer.concat([Buffer.from(MAINNET_HASH, "base64").subarray(0, 24), Buffer.alloc(8, 7)]).toString("base64");
    const { txn, b64url } = paymentTxn(address, spoof, "my-private-net-v1");
    await post(dapp, {
      id: "sp1",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: spoof, txns: [{ txn: b64url }] },
    });
    await expect(popup.getByTestId("direct-network")).toHaveText("Unknown network");
    await expect(popup.getByTestId("direct-network-unknown")).toBeVisible();
    await expect(popup.getByTestId("direct-network")).not.toContainText("Mainnet");
    // No enrichment from the wallet's (mainnet) node.
    await expect(popup.getByText("Node-reported preview")).toHaveCount(0);
    await expandAll(popup);
    await expect(popup.getByTestId("direct-foreign-note")).toBeVisible();
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("sp1"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature((response.data.result as { stxns: string[] }).stxns[0], txn, address);
    await expectClosed(popup);
  });

  test("sign: an unknown hash labelled with a known genesis ID is refused (4200)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const spoof = Buffer.concat([Buffer.from(MAINNET_HASH, "base64").subarray(0, 24), Buffer.alloc(8, 7)]).toString("base64");
    await post(dapp, {
      id: "sp2",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: spoof, txns: [{ txn: paymentTxn(address, spoof, "mainnet-v1.0").b64url }] },
    });
    const response = await waitForMessage(dapp, reply("sp2"));
    expect((response.data.error as { code: number }).code).toBe(4200);
    expect((response.data.error as { message: string }).message).toContain("genesis ID");
    await expectClosed(popup);
  });

  test("sign_data: a request without genesisHash says that no network was named", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "a10",
      reference: "arc0060:sign_data:request",
      params: { providerId: "d", items: [arc60Item(address, "127.0.0.1")] },
    });
    await expect(popup.getByTestId("direct-network-none")).toContainText("did not name a network");
    await expect(popup.getByTestId("direct-network-card")).toHaveCount(0);
    await popup.getByRole("button", { name: "Sign data" }).click();
    const response = await waitForMessage(dapp, reply("a10"));
    expect(response.data.error).toBeUndefined();
    await expectClosed(popup);
  });

  test("sign: a malformed genesis hash is refused (4200)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "s6",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: "not-a-hash", txns: [{ txn: paymentTxn(address).b64url }] },
    });
    const response = await waitForMessage(dapp, reply("s6"));
    expect((response.data.error as { code: number }).code).toBe(4200);
    await expectClosed(popup);
  });

  test("sign_data: a request naming another network is signed and shows that network", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "a9",
      reference: "arc0060:sign_data:request",
      params: { providerId: "d", genesisHash: TESTNET_HASH, items: [arc60Item(address, "127.0.0.1")] },
    });
    await expect(popup.getByTestId("direct-network")).toHaveText("Algorand Testnet");
    await expect(popup.getByTestId("direct-network-test")).toBeVisible();
    await popup.getByRole("button", { name: "Sign data" }).click();
    const response = await waitForMessage(dapp, reply("a9"));
    expect(response.data.error).toBeUndefined();
    const signatures = (response.data.result as { signatures: (string | null)[] }).signatures;
    expect(Buffer.from(signatures[0]!, "base64url")).toHaveLength(64);
    await expectClosed(popup);
  });

  test("/direct opened directly (no opener) shows an error and posts nothing", async ({ page }) => {
    await setupFreshWallet(page);
    const tab = await page.context().newPage();
    await tab.goto(`/direct?origin=${encodeURIComponent(DAPP_ORIGIN)}`);
    await unlock(tab);
    await expect(tab.getByTestId("direct-error-no-opener")).toBeVisible();
    await expect(tab.getByTestId("direct-approve")).toHaveCount(0);
  });

  test("/direct without a valid origin hint is refused", async ({ context, page }) => {
    await setupFreshWallet(page);
    const dapp = await openDapp(context);
    await dapp.evaluate(() => {
      (window as unknown as { __hint: string }).__hint = "http://evil.example.com";
    });
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await expect(popup.getByTestId("direct-error-bad-origin")).toBeVisible();
    expect(await messages(dapp)).toHaveLength(0);
  });

  test("/direct refuses to run inside a frame (clickjacking)", async ({ context, page }) => {
    await setupFreshWallet(page);
    // Same-site parent (so the framed wallet can reach its IndexedDB, unpartitioned): only the
    // framing check can stop it.
    await context.route(`${WALLET_ORIGIN}/__framer.html`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<iframe id="f" src="${WALLET_ORIGIN}/direct?origin=${encodeURIComponent(WALLET_ORIGIN)}" width="900" height="700"></iframe>`,
      }),
    );
    const framer = await context.newPage();
    await framer.goto(`${WALLET_ORIGIN}/__framer.html`);
    const frame = framer.frameLocator("#f");
    await frame.locator("#wallet-pass").fill(DEFAULT_WALLET_PASSWORD);
    await frame.locator("#new_wallet_button_open").click();
    await expect(frame.getByTestId("direct-error-framed")).toBeVisible();
    await expect(frame.getByTestId("direct-approve")).toHaveCount(0);
  });
  test("disable revokes the grant of the sender's origin", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, { id: "d1", reference: "arc0027:disable:request", params: { providerId: "d" } });
    const response = await waitForMessage(dapp, reply("d1"));
    expect(response.data.reference).toBe("arc0027:disable:response");
    expect(response.data.error).toBeUndefined();
    await expectClosed(popup);

    // Signing is refused again.
    const popup2 = await openPopup(context, dapp);
    await unlock(popup2);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "d2",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [{ txn: paymentTxn(address).b64url }] },
    });
    const refused = await waitForMessage(dapp, reply("d2"));
    expect((refused.data.error as { code: number }).code).toBe(4100);
    expect(refused.data.error).toMatchObject({ providerId: WALLET_PROVIDER_ID });
  });

  test("a reloaded popup never announces ready again (single-use channel)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const dapp = await openDapp(context);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await dapp.evaluate(() => {
      (window as unknown as { __messages: unknown[] }).__messages.length = 0;
    });
    await popup.reload();
    await unlock(popup);
    await expect(popup.getByTestId("direct-expired")).toBeVisible();
    expect(await messages(dapp)).toHaveLength(0);
    await expect(popup.getByTestId("direct-approve")).toHaveCount(0);
  });

  test("sign_data: an unapproved signer is refused (4100)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "a1",
      reference: "arc0060:sign_data:request",
      params: { providerId: "d", items: [arc60Item(OTHER_ADDR, "127.0.0.1")] },
    });
    const response = await waitForMessage(dapp, reply("a1"));
    expect((response.data.error as { code: number }).code).toBe(4100);
  });

  test("sign_data: without a grant it is refused (4100); with one an approved signer gets a 64-byte signature", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);

    const dapp0 = await openDapp(context);
    const popup0 = await openPopup(context, dapp0);
    await unlock(popup0);
    await waitForMessage(dapp0, isReady);
    await post(dapp0, {
      id: "a0",
      reference: "arc0060:sign_data:request",
      params: { providerId: "d", items: [arc60Item(address, "127.0.0.1")] },
    });
    const refused = await waitForMessage(dapp0, reply("a0"));
    expect((refused.data.error as { code: number }).code).toBe(4100);

    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "a2",
      reference: "arc0060:sign_data:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, items: [arc60Item(address, "127.0.0.1")] },
    });
    // The items are visible straight away and there is no sign-everything-at-once button.
    await expect(popup.getByRole("button", { name: "Sign data" })).toBeVisible();
    await expect(popup.getByText("Domain")).toBeVisible();
    await expect(popup.getByRole("button", { name: "Sign all" })).toHaveCount(0);
    await popup.getByRole("button", { name: "Sign data" }).click();
    const response = await waitForMessage(dapp, reply("a2"));
    expect(response.data.error).toBeUndefined();
    const signatures = (response.data.result as { providerId: string; signatures: (string | null)[] }).signatures;
    expect(signatures).toHaveLength(1);
    expect(Buffer.from(signatures[0]!, "base64url")).toHaveLength(64);
    await expectClosed(popup);
  });

  test("sign_data: a domain that is not the verified origin's host is not signed", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    // The item is self-consistent (authenticatorData hashes its own domain) but claims another site.
    await post(dapp, {
      id: "a3",
      reference: "arc0060:sign_data:request",
      params: { providerId: "d", items: [arc60Item(address, "victim.example.com")] },
    });
    await expect(popup.getByRole("button", { name: "Sign data" })).toBeVisible();
    await popup.getByRole("button", { name: "Sign data" }).click();
    // Signing failed: nothing was signed or returned; rejecting answers 4001.
    await expect(popup.getByRole("button", { name: "Send back to DApp" })).toHaveCount(0);
    await popup.getByRole("button", { name: "Reject" }).click();
    const response = await waitForMessage(dapp, reply("a3"));
    expect((response.data.error as { code: number }).code).toBe(4001);
  });
  test("concurrent grant updates are atomic: none is lost", async ({ page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const result = await page.evaluate(async (addr) => {
      type Store = { dispatch: (a: string, p?: unknown) => Promise<unknown> };
      const store = (document.querySelector("#app") as unknown as {
        __vue_app__: { config: { globalProperties: { $store: Store } } };
      }).__vue_app__.config.globalProperties.$store;
      const make = (i: number) => ({
        origin: `https://site${i}.example.com`,
        addresses: [addr],
        genesisHash: "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8",
        createdAt: i,
        lastUsedAt: i,
      });
      await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          store.dispatch("direct/updateSessions", (sessions: { origin: string }[]) => [...sessions, make(i)]),
        ),
      );
      const persisted = (await store.dispatch("wallet/wcGetItemFresh", { key: "direct:sessions" })) as { origin: string }[];
      return persisted.map((x) => x.origin).sort();
    }, address);
    expect(result).toEqual(Array.from({ length: 8 }, (_, i) => `https://site${i}.example.com`));
  });

  test("locking the wallet mid-request answers the dApp with 4001 and ends the channel", async ({ context, page }) => {
    await setupFreshWallet(page);
    const dapp = await openDapp(context);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, { id: "l1", reference: "arc0027:enable:request", params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} } });
    await expect(popup.getByTestId("direct-approve")).toBeVisible();
    await popup.evaluate(() => {
      const app = (document.querySelector("#app") as unknown as {
        __vue_app__: { config: { globalProperties: { $store: { dispatch: (a: string) => Promise<unknown> } } } };
      }).__vue_app__;
      return app.config.globalProperties.$store.dispatch("wallet/logout");
    });
    const response = await waitForMessage(dapp, reply("l1"));
    expect((response.data.error as { code: number }).code).toBe(4001);
    // The locked popup shows the login, never the stale approval.
    await expect(popup.getByTestId("direct-approve")).toHaveCount(0);
  });
  test("sign_data: use-wallet style domain (host with port) of the verified origin is signed", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    // use-wallet sets domain = location.host, which includes the port (127.0.0.1:8080 here).
    await post(dapp, {
      id: "p1",
      reference: "arc0060:sign_data:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, items: [arc60Item(address, "127.0.0.1:8080")] },
    });
    await popup.getByRole("button", { name: "Sign data" }).click();
    const response = await waitForMessage(dapp, reply("p1"));
    expect(response.data.error).toBeUndefined();
    const signatures = (response.data.result as { signatures: (string | null)[] }).signatures;
    expect(Buffer.from(signatures[0]!, "base64url")).toHaveLength(64);
  });
  test("signing view: warnings and fee stay visible; a partly signed request is not returned automatically", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    // Two transactions of the granted account; the first rekeys it to another address (dangerous).
    const first = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: address,
      amount: 0,
      rekeyTo: algosdk.generateAccount().addr.toString(),
      suggestedParams: {
        fee: 2000,
        flatFee: true,
        firstValid: 1000,
        lastValid: 2000,
        genesisHash: new Uint8Array(Buffer.from(MAINNET_HASH, "base64")),
        genesisID: "mainnet-v1.0",
      },
    });
    const second = paymentTxn(address).txn;
    algosdk.assignGroupID([first, second]);
    await post(dapp, {
      id: "g1",
      reference: "arc0027:sign_transactions:request",
      params: {
        providerId: "d",
        genesisHash: MAINNET_HASH,
        txns: [first, second].map((t) => ({ txn: Buffer.from(algosdk.encodeUnsignedTransaction(t)).toString("base64url") })),
      },
    });
    // The collapsed rows carry the warnings; opening them shows every field before signing.
    await expandAll(popup);
    await expect(popup.getByRole("cell", { name: "Rekey To:" }).first()).toBeVisible();
    await expect(popup.getByRole("cell", { name: "Fee:" }).first()).toBeVisible();
    await expect(popup.getByText(/0\.002000 Algo/).first()).toBeVisible();
    // Sign only the first: the request is NOT returned automatically.
    await popup.getByRole("button", { name: "Sign", exact: true }).first().click();
    await popup.waitForTimeout(1500);
    expect((await messages(dapp)).some(reply("g1"))).toBe(false);
    await expect(popup.getByRole("button", { name: "Send back to DApp" })).toBeVisible();
    // Signing the rest completes the request and sends it back by itself.
    await popup.getByRole("button", { name: "Sign", exact: true }).first().click();
    const response = await waitForMessage(dapp, reply("g1"));
    expect(response.data.error).toBeUndefined();
    expect((response.data.result as { stxns: (string | null)[] }).stxns.every((x) => x !== null)).toBe(true);
  });
  test("signing view: clawback source and app-call OnComplete are visible; a plain link shows no request banner", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);

    // A bare link to /direct (no opener) must not claim that a site is asking for access.
    const bare = await context.newPage();
    await bare.goto(`/direct?origin=${encodeURIComponent("https://trusted.example")}`);
    await expect(bare.locator("#new_wallet_button_open")).toBeVisible();
    await expect(bare.getByTestId("direct-unlock-banner")).toHaveCount(0);
    await bare.close();

    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    const sp = {
      fee: 1000,
      flatFee: true,
      firstValid: 1000,
      lastValid: 2000,
      genesisHash: new Uint8Array(Buffer.from(MAINNET_HASH, "base64")),
      genesisID: "mainnet-v1.0",
    };
    const victim = algosdk.generateAccount().addr.toString();
    const clawback = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: address,
      assetSender: victim,
      amount: 5,
      assetIndex: 31566704,
      suggestedParams: sp,
    });
    const del = algosdk.makeApplicationDeleteTxnFromObject({
      sender: address,
      appIndex: 1234,
      suggestedParams: sp,
    });
    algosdk.assignGroupID([clawback, del]);
    await post(dapp, {
      id: "c1",
      reference: "arc0027:sign_transactions:request",
      params: {
        providerId: "d",
        genesisHash: MAINNET_HASH,
        txns: [clawback, del].map((t) => ({ txn: Buffer.from(algosdk.encodeUnsignedTransaction(t)).toString("base64url") })),
      },
    });
    // The warnings are on the collapsed summary; the detail rows name the accounts and calls.
    await expect(popup.getByTestId("direct-tx-clawback")).toBeVisible();
    await expect(popup.getByTestId("direct-tx-destructive")).toBeVisible();
    await expandAll(popup);
    await expect(popup.getByRole("cell", { name: "Clawback from:", exact: true })).toBeVisible();
    await expect(popup.getByText("not from the sender").first()).toBeVisible();
    // The destructive app call is a lifecycle transaction: its application card says what it does.
    await expect(popup.getByTestId("direct-app-card")).toContainText("Delete application");
  });

  test("single transaction: exactly one Sign button in the collapsed popup", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "one",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [{ txn: paymentTxn(address).b64url }] },
    });
    // Collapsed: one Sign button for the single transaction and no "Sign all".
    await expect(popup.getByRole("button", { name: "Sign transaction" })).toHaveCount(1);
    await expect(popup.getByRole("button", { name: "Sign all" })).toHaveCount(0);
    await expect(popup.getByRole("button", { name: "Sign", exact: true })).toHaveCount(0);
  });
  test("transaction kinds the popup cannot show completely are refused (4200)", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const sp = {
      fee: 1000,
      flatFee: true,
      firstValid: 1000,
      lastValid: 2000,
      genesisHash: new Uint8Array(Buffer.from(MAINNET_HASH, "base64")),
      genesisID: "mainnet-v1.0",
    };
    const attacker = algosdk.generateAccount().addr.toString();
    const cases: { name: string; txn: algosdk.Transaction; reason: RegExp }[] = [
      {
        name: "asset config handing clawback to another account",
        txn: algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
          sender: address,
          total: 1,
          decimals: 0,
          defaultFrozen: false,
          clawback: attacker,
          suggestedParams: sp,
        }),
        reason: /acfg/,
      },
      {
        name: "asset freeze",
        txn: algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
          sender: address,
          assetIndex: 31566704,
          freezeTarget: attacker,
          frozen: true,
          suggestedParams: sp,
        }),
        reason: /afrz/,
      },
      {
        name: "key registration",
        txn: algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
          sender: address,
          nonParticipation: true,
          suggestedParams: sp,
        }),
        reason: /keyreg/,
      },
    ];
    const dapp = await connectSite(context, address);
    for (const [i, c] of cases.entries()) {
      const popup = await openPopup(context, dapp);
      await unlock(popup);
      await waitForMessage(dapp, isReady);
      await post(dapp, {
        id: `u${i}`,
        reference: "arc0027:sign_transactions:request",
        params: {
          providerId: "d",
          genesisHash: MAINNET_HASH,
          txns: [{ txn: Buffer.from(algosdk.encodeUnsignedTransaction(c.txn)).toString("base64url") }],
        },
      });
      const response = await waitForMessage(dapp, reply(`u${i}`));
      expect((response.data.error as { code: number }).code, c.name).toBe(4200);
      expect((response.data.error as { message: string }).message, c.name).toMatch(c.reason);
      await expectClosed(popup);
    }
  });
});
