import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import { setupFreshWallet, spaNavigate } from "../support/wallet";

const toBase64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const buildTxn = (sender: string, rekeyTo?: string) =>
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount: 0,
    rekeyTo,
    suggestedParams: {
      fee: 1000,
      flatFee: true,
      firstValid: 1000,
      lastValid: 2000,
      genesisHash: new Uint8Array(Buffer.from("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=", "base64")),
      genesisID: "mainnet-v1.0",
      minFee: 1000,
    },
  });

test.describe("Sign page: rekey review (AW-2026-100)", () => {
  test("a rekey delivered inside the transaction bytes is shown with its target", async ({
    page,
  }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];
    const attacker = algosdk.generateAccount().addr.toString();

    const bytes = algosdk.encodeUnsignedTransaction(buildTxn(account, attacker));
    await spaNavigate(page, `/sign/${account}/${toBase64Url(bytes)}`);

    // The rekey row and the target address are on the review page although the page itself was
    // not the one that built the transaction.
    const rekeyRow = page.locator(".field.grid", { hasText: "Rekey to" });
    await expect(rekeyRow).toBeVisible();
    // AlgorandAddress shortens to the first and last four characters.
    await expect(rekeyRow).toContainText(`${attacker.slice(0, 4)}..${attacker.slice(-4)}`);
  });

  test("a plain payment without a rekey shows no rekey row", async ({ page }) => {
    await setupFreshWallet(page);
    const account = page.url().split("/account/")[1];

    const bytes = algosdk.encodeUnsignedTransaction(buildTxn(account));
    await spaNavigate(page, `/sign/${account}/${toBase64Url(bytes)}`);

    await expect(page.getByText("Sign transaction", { exact: true }).first()).toBeVisible();
    await expect(page.locator(".field.grid", { hasText: "Rekey to" })).toHaveCount(0);
  });
});
