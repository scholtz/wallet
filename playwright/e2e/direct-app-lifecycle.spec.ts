// Biatec Direct signs the whole application lifecycle (create, update, delete) and the popup
// shows what each one does: a high-impact card with the kind, the programs (size + SHA-256) and
// the state schema, open by default so it is seen before signing.
import { test, expect, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { createHash } from "node:crypto";
import { setupFreshWallet } from "../support/wallet";
import {
  MAINNET_HASH,
  connectSite,
  encode,
  expectClosed,
  expectValidSignature,
  isReady,
  openPopup,
  post,
  reply,
  unlock,
  waitForMessage,
  walletAddress,
} from "../support/direct";

// #pragma version 10; int 1; return
const APPROVAL = new Uint8Array([0x0a, 0x81, 0x01, 0x43]);
const CLEAR = new Uint8Array([0x0a, 0x81, 0x01, 0x43]);
const sha256Hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const params = () => ({
  fee: 1000,
  flatFee: true,
  firstValid: 1000,
  lastValid: 2000,
  genesisHash: new Uint8Array(Buffer.from(MAINNET_HASH, "base64")),
  genesisID: "mainnet-v1.0",
});

async function requestApp(
  context: Parameters<typeof openPopup>[0],
  address: string,
  id: string,
  txn: algosdk.Transaction,
): Promise<{ dapp: Page; popup: Page }> {
  const dapp = await connectSite(context, address);
  const popup = await openPopup(context, dapp);
  await unlock(popup);
  await waitForMessage(dapp, isReady);
  await post(dapp, {
    id,
    reference: "arc0027:sign_transactions:request",
    params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [encode(txn)] },
  });
  return { dapp, popup };
}

const stxn = (message: { data: Record<string, unknown> }) =>
  (message.data.result as { stxns: string[] }).stxns[0];

test.describe("Biatec Direct: application lifecycle", () => {
  test.describe.configure({ timeout: 240000 });

  test("creating an application is signed; the popup shows kind, programs and schema first", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const txn = algosdk.makeApplicationCreateTxnFromObject({
      sender: address,
      suggestedParams: params(),
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram: APPROVAL,
      clearProgram: CLEAR,
      numGlobalInts: 2,
      numGlobalByteSlices: 3,
      numLocalInts: 1,
      numLocalByteSlices: 4,
      extraPages: 1,
    });
    const { dapp, popup } = await requestApp(context, address, "create", txn);

    // The collapsed summary names it for what it is, not "appl".
    await expect(popup.getByTestId("direct-tx-app-kind")).toHaveText("Create application");
    // High impact: the details are open without a click.
    const card = popup.getByTestId("direct-app-card");
    await expect(card).toBeVisible();
    await expect(card.getByTestId("direct-app-warning")).toContainText("deploys a new smart contract");
    await expect(card.getByTestId("direct-app-id")).toContainText("assigned when the transaction is confirmed");
    await expect(card.getByTestId("direct-app-approval-hash")).toHaveText(sha256Hex(APPROVAL));
    await expect(card.getByTestId("direct-app-approval-size")).toContainText(`${APPROVAL.length} bytes`);
    await expect(card.getByTestId("direct-app-clear-hash")).toHaveText(sha256Hex(CLEAR));
    await expect(card.getByTestId("direct-app-global-schema")).toContainText("2 integers");
    await expect(card.getByTestId("direct-app-global-schema")).toContainText("3 byte slices");
    await expect(card.getByTestId("direct-app-local-schema")).toContainText("1 integer");
    await expect(card.getByTestId("direct-app-local-schema")).toContainText("4 byte slices");
    await expect(card.getByTestId("direct-app-extra-pages")).toContainText("1");
    // The raw program bytes are one click away.
    await card.getByTestId("direct-app-approval-bytes-toggle").click();
    await expect(card.getByTestId("direct-app-approval-bytes")).toContainText("0a810143");

    expect(await dappMessages(dapp)).toBe(false);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("create"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature(stxn(response), txn, address);
    await expectClosed(popup);
  });

  test("updating an application is signed and says it replaces the contract code", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const txn = algosdk.makeApplicationUpdateTxnFromObject({
      sender: address,
      suggestedParams: params(),
      appIndex: 987654,
      approvalProgram: APPROVAL,
      clearProgram: CLEAR,
    });
    const { dapp, popup } = await requestApp(context, address, "update", txn);
    await expect(popup.getByTestId("direct-tx-app-kind")).toHaveText("Update application");
    const card = popup.getByTestId("direct-app-card");
    await expect(card).toBeVisible();
    await expect(card.getByTestId("direct-app-warning")).toContainText("replaces the code");
    await expect(card.getByTestId("direct-app-id")).toContainText("987654");
    await expect(card.getByTestId("direct-app-approval-hash")).toHaveText(sha256Hex(APPROVAL));
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("update"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature(stxn(response), txn, address);
    await expectClosed(popup);
  });

  test("deleting an application is signed and says it destroys the contract", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const txn = algosdk.makeApplicationDeleteTxnFromObject({
      sender: address,
      suggestedParams: params(),
      appIndex: 4242,
    });
    const { dapp, popup } = await requestApp(context, address, "delete", txn);
    await expect(popup.getByTestId("direct-tx-app-kind")).toHaveText("Delete application");
    const card = popup.getByTestId("direct-app-card");
    await expect(card).toBeVisible();
    await expect(card.getByTestId("direct-app-warning")).toContainText("deletes the smart contract");
    await expect(card.getByTestId("direct-app-id")).toContainText("4242");
    // A delete carries no programs.
    await expect(card.getByTestId("direct-app-approval-hash")).toHaveCount(0);
    await popup.getByRole("button", { name: "Sign transaction" }).click();
    const response = await waitForMessage(dapp, reply("delete"));
    expect(response.data.error).toBeUndefined();
    expectValidSignature(stxn(response), txn, address);
    await expectClosed(popup);
  });

  test("a group mixing a deployment with an ordinary call shows the card only for the deployment", async ({
    context,
    page,
  }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const create = algosdk.makeApplicationCreateTxnFromObject({
      sender: address,
      suggestedParams: params(),
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram: APPROVAL,
      clearProgram: CLEAR,
      numGlobalInts: 0,
      numGlobalByteSlices: 0,
      numLocalInts: 0,
      numLocalByteSlices: 0,
    });
    const noop = algosdk.makeApplicationNoOpTxnFromObject({
      sender: address,
      suggestedParams: params(),
      appIndex: 1234,
    });
    algosdk.assignGroupID([create, noop]);
    const dapp = await connectSite(context, address);
    const popup = await openPopup(context, dapp);
    await unlock(popup);
    await waitForMessage(dapp, isReady);
    await post(dapp, {
      id: "mixed-app",
      reference: "arc0027:sign_transactions:request",
      params: { providerId: "d", genesisHash: MAINNET_HASH, txns: [encode(create), encode(noop)] },
    });
    await expect(popup.getByTestId("direct-tx-line")).toHaveCount(2);
    await expect(popup.getByTestId("direct-app-card")).toHaveCount(1);
    // Only the deployment gets the lifecycle card; the ordinary call keeps its normal row.
    await expect(popup.getByTestId("direct-tx-app-kind")).toHaveCount(1);
  });

  test("an ordinary app call shows no lifecycle card and stays collapsed", async ({ context, page }) => {
    await setupFreshWallet(page);
    const address = walletAddress(page);
    const txn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: address,
      suggestedParams: params(),
      appIndex: 1234,
    });
    const { popup } = await requestApp(context, address, "noop", txn);
    await expect(popup.getByTestId("direct-tx-line")).toHaveCount(1);
    await expect(popup.getByTestId("direct-app-card")).toHaveCount(0);
    await expect(popup.getByTestId("direct-tx-app-kind")).toHaveCount(0);
  });
});

/** True once the dApp has received any reply (it must not before the user signs). */
async function dappMessages(dapp: Page): Promise<boolean> {
  const all = await dapp.evaluate(
    () => (window as unknown as { __messages: { data: { requestId?: string } }[] }).__messages,
  );
  return all.some((m) => m.data.requestId === "create");
}
