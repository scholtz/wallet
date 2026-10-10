// Biatec Direct must be able to sign for every kind of account the wallet holds: HD, plain
// ed25519, Falcon-1024 (post-quantum), Ledger, multisig (and accounts rekeyed to those).
// Accounts are created through the store of the unlocked main tab (they are persisted, so the
// popup sees them after its own unlock); the dApp is the fixture page of support/direct.ts.
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { setupFreshWallet } from "../support/wallet";
import {
  MAINNET_HASH,
  encode,
  expectClosed,
  expectValidSignature,
  isReady,
  messages,
  openDapp,
  openPopup,
  paymentTxn,
  post,
  reply,
  unlock,
  waitForMessage,
  walletAddress,
} from "../support/direct";

interface StoreLike {
  dispatch: (type: string, payload?: unknown) => Promise<unknown>;
  state: { wallet: { privateAccounts: { addr: string; type?: string }[] } };
}
interface AppHost extends Element {
  __vue_app__?: { config: { globalProperties: { $store: StoreLike } } };
}

/** Dispatch a store action in the unlocked main tab. */
const dispatch = (page: Page, type: string, payload?: unknown) =>
  page.evaluate(
    ([t, p]) => {
      const host = document.querySelector("#app") as AppHost | null;
      const store = host?.__vue_app__?.config.globalProperties.$store;
      if (!store) throw new Error("store not found");
      return store.dispatch(t as string, p);
    },
    [type, payload] as [string, unknown],
  );

async function addEd25519(page: Page, name: string): Promise<string> {
  const account = algosdk.generateAccount();
  const added = await dispatch(page, "wallet/addPrivateAccount", {
    mn: algosdk.secretKeyToMnemonic(account.sk),
    name,
  });
  expect(added).toBe(true);
  return account.addr.toString();
}

const addFalcon = (page: Page, name: string) =>
  dispatch(page, "wallet/addFalconAccount", { name, backedUp: true }) as Promise<string>;

/**
 * Connect the fixture site for exactly `addresses` (the enable screen pre-selects only the last
 * active account), approve, and return the dApp page.
 */
async function connectFor(
  context: BrowserContext,
  addresses: string[],
): Promise<Page> {
  const dapp = await openDapp(context);
  const popup = await openPopup(context, dapp);
  await unlock(popup);
  await waitForMessage(dapp, isReady);
  await post(dapp, {
    id: "enable-types",
    reference: "arc0027:enable:request",
    params: {
      providerId: "dapp",
      genesisHash: MAINNET_HASH,
      metadata: { name: "Fixture dApp", description: "", url: "", icons: [] },
    },
  });
  const approve = popup.getByTestId("direct-approve");
  await expect(approve).toBeVisible();
  const boxes = popup.locator('[data-testid^="direct-account-"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) {
    const box = boxes.nth(i);
    const testId = (await box.getAttribute("data-testid")) ?? "";
    const wanted = addresses.includes(testId.replace("direct-account-", ""));
    const checked = await box.locator("input").isChecked();
    if (wanted !== checked) await box.click();
  }
  await approve.click();
  const response = await waitForMessage(dapp, reply("enable-types"));
  expect(response.data.error).toBeUndefined();
  const granted = (response.data.result as { accounts: { address: string }[] }).accounts
    .map((a) => a.address)
    .sort();
  expect(granted).toEqual([...addresses].sort());
  await expectClosed(popup);
  return dapp;
}

/** Open the popup, send a sign_transactions request and return it with the (unlocked) popup. */
async function requestSignature(
  context: BrowserContext,
  dapp: Page,
  id: string,
  txns: algosdk.Transaction[],
) {
  const popup = await openPopup(context, dapp);
  await unlock(popup);
  await waitForMessage(dapp, isReady);
  await post(dapp, {
    id,
    reference: "arc0027:sign_transactions:request",
    params: { providerId: "d", genesisHash: MAINNET_HASH, txns: txns.map(encode) },
  });
  return popup;
}

/** Suggested params of a Mainnet transaction. */
const mainnetParams = () => ({
  fee: 1000,
  flatFee: true,
  firstValid: 1000,
  lastValid: 2000,
  genesisHash: new Uint8Array(Buffer.from(MAINNET_HASH, "base64")),
  genesisID: "mainnet-v1.0",
});

const stxnsOf = (message: { data: Record<string, unknown> }) =>
  (message.data.result as { stxns: (string | null)[] }).stxns;

test.describe("Biatec Direct signs for every account type", () => {
  test.describe.configure({ timeout: 240000 });

  test("the connect screen offers every account type, not only the HD one", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const hd = walletAddress(page);
    const plain = await addEd25519(page, "Plain Account");
    const falcon = await addFalcon(page, "Falcon Account");
    const dapp = await openDapp(context);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "list",
      reference: "arc0027:enable:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} },
    });
    for (const address of [hd, plain, falcon]) {
      await expect(popup.getByTestId(`direct-account-${address}`)).toBeVisible();
    }
  });

  test("a plain ed25519 account signs and the signature verifies", async ({ context, page }) => {
    await setupFreshWallet(page);
    const plain = await addEd25519(page, "Plain Account");
    const dapp = await connectFor(context, [plain]);
    const { txn } = paymentTxn(plain);
    const popup = await requestSignature(context, dapp, "ed", [txn]);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("ed"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature(stxnsOf(response)[0]!, txn, plain);
    await expectClosed(popup);
  });

  test("a Falcon-1024 (post-quantum) account signs with a pqsig envelope", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const falcon = await addFalcon(page, "Falcon Account");
    const dapp = await connectFor(context, [falcon]);
    const { txn } = paymentTxn(falcon);
    const popup = await requestSignature(context, dapp, "pq", [txn]);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("pq"));
    expect(response.data.error).toBeUndefined();
    const blob = new Uint8Array(Buffer.from(stxnsOf(response)[0]!, "base64url"));
    const decoded = algosdk.decodeObj(blob) as { pqsig?: unknown; sig?: unknown };
    expect(decoded.pqsig).toBeDefined();
    expect(decoded.sig).toBeUndefined();
    expect(algosdk.decodeSignedTransaction(blob).txn.txID()).toBe(txn.txID());
    await expectClosed(popup);
  });

  test("a Ledger account signs (the device call is stubbed, the Direct flow is real)", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const ledger = algosdk.generateAccount();
    const ledgerAddr = ledger.addr.toString();
    const added = await dispatch(page, "wallet/addLedgerAccount", {
      name: "Ledger Account",
      addr: ledgerAddr,
      addr0: ledgerAddr,
      slot: 0,
    });
    expect(added).toBe(true);
    const dapp = await connectFor(context, [ledgerAddr]);
    const { txn } = paymentTxn(ledgerAddr);
    const popup = await requestSignature(context, dapp, "ledger", [txn]);
    // No hardware in CI: replace the device call with a signature made by the test.
    const signed = Array.from(txn.signTxn(ledger.sk));
    await popup.evaluate((bytes) => {
      const host = document.querySelector("#app") as AppHost | null;
      const store = host?.__vue_app__?.config.globalProperties.$store as unknown as {
        commit: (type: string, payload: Uint8Array) => void;
        _actions: Record<string, ((payload: unknown) => Promise<Uint8Array>)[]>;
      };
      const blob = Uint8Array.from(bytes);
      store._actions["signer/signByLedger"] = [
        async () => {
          store.commit("signer/setSigned", blob);
          return blob;
        },
      ];
    }, signed);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("ledger"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature(stxnsOf(response)[0]!, txn, ledgerAddr);
    await expectClosed(popup);
  });

  test("the request list is collapsed by default with one summary line per transaction", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const plain = await addEd25519(page, "Plain Account");
    const dapp = await connectFor(context, [plain]);
    const pay = paymentTxn(plain).txn;
    const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: plain,
      receiver: plain,
      amount: 5,
      assetIndex: 31566704,
      suggestedParams: mainnetParams(),
    });
    algosdk.assignGroupID([pay, axfer]);
    const popup = await requestSignature(context, dapp, "collapsed", [pay, axfer]);
    await expect(popup.getByTestId("direct-tx-summary")).toBeVisible();
    await expect(popup.getByTestId("direct-tx-line")).toHaveCount(2);
    // The sender of every transaction is on its summary line (which granted account signs).
    await expect(popup.getByTestId("direct-tx-from")).toHaveCount(2);
    await expect(popup.getByTestId("direct-tx-line").first()).toContainText("pay");
    await expect(popup.getByTestId("direct-tx-line").nth(1)).toContainText("axfer");
    // Details (and the per-transaction Sign buttons) stay closed until the row is expanded.
    await expect(popup.getByText("Genesis Hash:")).toHaveCount(0);
    await expect(popup.getByRole("button", { name: "Sign", exact: true })).toHaveCount(0);
    await expect(popup.getByRole("button", { name: "Sign all" })).toBeVisible();
    await popup.locator(".p-datatable-row-toggle-button").first().click();
    await expect(popup.getByRole("button", { name: "Sign", exact: true })).toHaveCount(2);
  });

  test("a single transaction can be signed from the collapsed row", async ({ context, page }) => {
    await setupFreshWallet(page);
    const plain = await addEd25519(page, "Plain Account");
    const dapp = await connectFor(context, [plain]);
    const { txn } = paymentTxn(plain);
    const popup = await requestSignature(context, dapp, "single", [txn]);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("single"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature(stxnsOf(response)[0]!, txn, plain);
    await expectClosed(popup);
  });

  test("a Falcon sender with a too low fee gets a warning (the site fixed the fee)", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const falcon = await addFalcon(page, "Falcon Account");
    const dapp = await connectFor(context, [falcon]);
    const { txn } = paymentTxn(falcon);
    const popup = await requestSignature(context, dapp, "pq-fee", [txn]);
    await expect(popup.getByTestId("direct-falcon-fee")).toContainText("Falcon-1024");
    await expect(popup.getByTestId("direct-falcon-fee")).toContainText("0.003");
  });

  test("an ordinary sender gets no Falcon fee warning", async ({ context, page }) => {
    await setupFreshWallet(page);
    const plain = await addEd25519(page, "Plain Account");
    const dapp = await connectFor(context, [plain]);
    const popup = await requestSignature(context, dapp, "no-pq-fee", [paymentTxn(plain).txn]);
    await expect(popup.getByTestId("direct-tx-summary")).toBeVisible();
    await expect(popup.getByTestId("direct-falcon-fee")).toHaveCount(0);
  });

  test("a multisig account signs with an HD signator and the result goes back by itself", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const hd = walletAddress(page);
    const stranger = algosdk.generateAccount().addr.toString();
    const params = { version: 1, threshold: 1, addrs: [hd, stranger] };
    const msig = algosdk.multisigAddress(params).toString();
    expect(await dispatch(page, "wallet/addMultiAccount", { params, name: "Msig" })).toBe(true);
    const dapp = await connectFor(context, [msig]);
    const { txn } = paymentTxn(msig);
    const popup = await requestSignature(context, dapp, "msig", [txn]);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    await popup.getByRole("button", { name: "Create multisig proposal" }).click();
    await popup.locator(".p-multiselect").click();
    await popup.locator(".p-multiselect-option").first().click();
    await popup.keyboard.press("Escape");
    await popup.getByRole("button", { name: "Sign", exact: true }).click();
    // Threshold reached: the button names the website (not WalletConnect) and returns it.
    const back = popup.getByTestId("return-to-dapp");
    await expect(back).toHaveText("Return to the website");
    await expect(back).toBeEnabled();
    await back.click();
    const response = await waitForMessage(dapp, reply("msig"));
    expect(response.data.error).toBeUndefined();
    const blob = new Uint8Array(Buffer.from(stxnsOf(response)[0]!, "base64url"));
    expect(algosdk.decodeSignedTransaction(blob).txn.txID()).toBe(txn.txID());
    const msigOf = algosdk.decodeObj(blob) as { msig: { thr: number; subsig: { s?: Uint8Array }[] } };
    expect(msigOf.msig.subsig.filter((s) => s.s)).toHaveLength(1);
    await expectClosed(popup);
  });

  test("a multisig below its threshold can be returned partially signed", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const hd = walletAddress(page);
    const other = await addEd25519(page, "Second Signer");
    const params = { version: 1, threshold: 2, addrs: [hd, other] };
    const msig = algosdk.multisigAddress(params).toString();
    expect(await dispatch(page, "wallet/addMultiAccount", { params, name: "Msig 2of2" })).toBe(true);
    const dapp = await connectFor(context, [msig]);
    const { txn } = paymentTxn(msig);
    const popup = await requestSignature(context, dapp, "msig-partial", [txn]);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    await popup.getByRole("button", { name: "Create multisig proposal" }).click();
    await popup.locator(".p-multiselect").click();
    await popup.locator(".p-multiselect-option").filter({ hasText: "Second Signer" }).click();
    await popup.keyboard.press("Escape");
    await popup.getByRole("button", { name: "Sign", exact: true }).click();
    await expect(popup.getByText(/Signatures 1 \/ 2/)).toBeVisible();
    const back = popup.getByTestId("return-to-dapp");
    await expect(back).toHaveText("Return partially signed to the website");
    await expect(back).toBeEnabled();
    await back.click();
    // Not complete, so nothing was sent on its own: the user decides to send it back.
    expect((await messages(dapp)).some(reply("msig-partial"))).toBe(false);
    await popup.getByRole("button", { name: "Send back to DApp" }).click();
    const response = await waitForMessage(dapp, reply("msig-partial"));
    expect(response.data.error).toBeUndefined();
    const partial = algosdk.decodeObj(
      new Uint8Array(Buffer.from(stxnsOf(response)[0]!, "base64url")),
    ) as { msig: { thr: number; subsig: { s?: Uint8Array }[] } };
    expect(partial.msig.subsig.filter((s) => s.s)).toHaveLength(1);
    expect(partial.msig.thr).toBe(2);
    await expectClosed(popup);
  });

  test("an account rekeyed to a Falcon account is signed by the Falcon key", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const falcon = await addFalcon(page, "Falcon Signer");
    const plain = await addEd25519(page, "Rekeyed Account");
    // Per-network rekey data, as the wallet records it after syncing the account from the chain.
    await page.evaluate(
      ([addr, target]) => {
        const host = document.querySelector("#app") as AppHost | null;
        const store = host?.__vue_app__?.config.globalProperties.$store as unknown as {
          commit: (type: string, payload: unknown) => void;
          dispatch: (type: string) => Promise<unknown>;
        };
        store.commit("wallet/setAccountRekey", {
          addr,
          network: "mainnet-v1.0",
          rekeyedTo: target,
        });
        return store.dispatch("wallet/saveWallet");
      },
      [plain, falcon] as [string, string],
    );    const dapp = await connectFor(context, [plain]);
    const { txn } = paymentTxn(plain);
    const popup = await requestSignature(context, dapp, "rekeyed", [txn]);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("rekeyed"));
    expect(response.data.error).toBeUndefined();
    const blob = new Uint8Array(Buffer.from(stxnsOf(response)[0]!, "base64url"));
    const raw = algosdk.decodeObj(blob) as { pqsig?: unknown; sgnr?: Uint8Array };
    expect(raw.pqsig).toBeDefined();
    expect(algosdk.encodeAddress(raw.sgnr!)).toBe(falcon);
    await expectClosed(popup);
  });
});