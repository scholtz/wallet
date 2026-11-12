import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import { setupFreshWallet, spaNavigate } from "../support/wallet";

// AW-2026-112/-113/-117: the /sign review must show what the transaction itself moves or does,
// read from algosdk v3's nested fields - the amount of a multisig proposal, the asset of an asset
// transfer whose metadata is unavailable, and the real kind of a key registration.

const toBase64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const suggestedParams = {
  fee: 1000,
  flatFee: true,
  firstValid: 1000,
  lastValid: 2000,
  genesisHash: new Uint8Array(Buffer.from("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=", "base64")),
  genesisID: "mainnet-v1.0",
  minFee: 1000,
};

const shortAddress = (addr: string) => `${addr.slice(0, 4)}..${addr.slice(-4)}`;

test.describe("Sign page review details", () => {
  test("a multisig proposal shows its amount and receiver (AW-2026-112)", async ({ page }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];
    const cosigner = algosdk.generateAccount().addr.toString();
    const receiver = algosdk.generateAccount().addr.toString();
    const params = { version: 1, threshold: 2, addrs: [account, cosigner] };
    const msigAddr = algosdk.multisigAddress(params).toString();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: msigAddr,
      receiver,
      amount: 5_000_000,
      suggestedParams,
    });
    const proposal = algosdk.createMultisigTransaction(txn, params);

    await spaNavigate(page, `/sign/${account}/${toBase64Url(proposal)}`);

    await expect(page.getByTestId("sign-msig-amount")).toContainText("5");
    await expect(page.getByTestId("sign-msig-amount")).toContainText("Algo");
    await expect(page.getByTestId("sign-msig-receiver")).toContainText(shortAddress(receiver));
  });

  test("a multisig asset transfer shows the asset id, amount and receiver (AW-2026-112)", async ({
    page,
  }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];
    const cosigner = algosdk.generateAccount().addr.toString();
    const receiver = algosdk.generateAccount().addr.toString();
    const params = { version: 1, threshold: 2, addrs: [account, cosigner] };
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: algosdk.multisigAddress(params).toString(),
      receiver,
      assetIndex: 999999999999,
      amount: 7,
      suggestedParams,
    });
    const proposal = algosdk.createMultisigTransaction(txn, params);

    await spaNavigate(page, `/sign/${account}/${toBase64Url(proposal)}`);

    await expect(page.getByTestId("sign-msig-asset")).toHaveText("999999999999");
    await expect(page.getByTestId("sign-msig-amount")).toContainText("7");
    await expect(page.getByTestId("sign-msig-receiver")).toContainText(shortAddress(receiver));
  });

  test("an asset transfer of an asset without metadata is shown in base units under its id (AW-2026-117)", async ({
    page,
  }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];
    const receiver = algosdk.generateAccount().addr.toString();
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: account,
      receiver,
      assetIndex: 999999999999,
      amount: 3,
      suggestedParams,
    });

    await spaNavigate(
      page,
      `/sign/${account}/${toBase64Url(algosdk.encodeUnsignedTransaction(txn))}`,
    );

    const amount = page.getByTestId("sign-asset-amount-unknown");
    await expect(amount).toBeVisible();
    await expect(amount).toContainText("3 (asset 999999999999, base units)");
    await expect(amount).not.toContainText("Algo");
  });

  test("an online key registration shows its keys, not an unregistration (AW-2026-113)", async ({
    page,
  }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];
    const voteKey = new Uint8Array(32).fill(1);
    const selectionKey = new Uint8Array(32).fill(2);
    const stateProofKey = new Uint8Array(64).fill(3);
    const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
      sender: account,
      voteKey,
      selectionKey,
      stateProofKey,
      voteFirst: 1000,
      voteLast: 2000,
      voteKeyDilution: 100,
      suggestedParams,
    });

    await spaNavigate(
      page,
      `/sign/${account}/${toBase64Url(algosdk.encodeUnsignedTransaction(txn))}`,
    );

    await expect(page.getByTestId("sign-special-summary")).toContainText("takes the account online");
    await expect(page.getByTestId("sign-keyreg-vote-key")).toContainText(
      Buffer.from(voteKey).toString("base64"),
    );
    await expect(page.getByTestId("sign-keyreg-rounds")).toContainText("1000 - 2000");
    await expect(page.getByText("Tx to unregister from the participation")).toHaveCount(0);
  });

  test("a non-participation key registration is flagged as irreversible (AW-2026-113)", async ({
    page,
  }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];
    const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
      sender: account,
      nonParticipation: true,
      suggestedParams,
    });

    await spaNavigate(
      page,
      `/sign/${account}/${toBase64Url(algosdk.encodeUnsignedTransaction(txn))}`,
    );

    await expect(page.getByTestId("sign-special-summary")).toContainText("cannot be undone");
  });

  test("a long note that looks like a URL is plain text, not a link (AW-2026-124)", async ({
    page,
  }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];
    const url = "https://attacker.example/" + "a".repeat(40);
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account,
      receiver: account,
      amount: 0,
      note: new TextEncoder().encode(url),
      suggestedParams,
    });

    await spaNavigate(
      page,
      `/sign/${account}/${toBase64Url(algosdk.encodeUnsignedTransaction(txn))}`,
    );

    const note = page.getByTestId("sign-note");
    await expect(note).toContainText(url);
    await expect(note.locator("a")).toHaveCount(0);
  });
});
