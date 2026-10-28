import { test, expect, type Page } from "@playwright/test";
import { clearAWalletDB } from "../support/wallet";

// AW-2026-084 / AW-2026-099: the gateway link builder scales the amount by the asset's decimals
// and the gateway page only calls an order paid for the right receiver and amount.

const PAY_TO = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";
const b64 = (value: string) =>
  encodeURIComponent(Buffer.from(value, "utf8").toString("base64"));
const gatewayUrl = (uri: string) => `/gateway/${b64(uri)}`;

const transaction = (amount: number, receiver = PAY_TO) => ({
  id: "TXIDTXIDTXIDTXIDTXIDTXIDTXIDTXIDTXIDTXIDTXIDTXIDTXID",
  sender: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  fee: 1000,
  "first-valid": 1,
  "last-valid": 1000,
  "tx-type": "pay",
  "confirmed-round": 10,
  "intra-round-offset": 0,
  "round-time": 1700000000,
  "payment-transaction": { receiver, amount, "close-amount": 0 },
});

/** Answers the testnet indexer search with the given transactions. */
const mockIndexer = async (page: Page, transactions: object[]) => {
  await page.route(/testnet-idx\.algonode\.cloud\/v2\/transactions/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { "current-round": 100, "next-token": "", transactions },
    }),
  );
};

test.describe("Payment gateway builder", () => {
  test("scales the amount by the asset's decimals and refuses an invalid payee", async ({
    page,
  }) => {
    await clearAWalletDB(page);
    await page.goto("/payment-gateway/");
    await page.getByRole("button", { name: "Turn on the build tool" }).click();
    await page.locator("#pay_to").fill(PAY_TO);
    await page.locator("#amount").fill("1.5");
    await page.locator("#amount").blur();
    await expect(
      page.locator("code").filter({ hasText: "algorand://" }).first(),
    ).toContainText(`algorand://${PAY_TO}?amount=1500000`);
    await expect(page.getByText("Generated link")).toBeVisible();

    await page.locator("#pay_to").fill("not-an-address");
    await expect(
      page.getByText("Please fill in at least account, amount and asset"),
    ).toBeVisible();
    await expect(page.getByText("Generated link")).toHaveCount(0);
  });

  test("an xnote is URL-encoded in the generated link", async ({ page }) => {
    await clearAWalletDB(page);
    await page.goto("/payment-gateway/");
    await page.getByRole("button", { name: "Turn on the build tool" }).click();
    await page.locator("#pay_to").fill(PAY_TO);
    await page.locator("#amount").fill("1");
    await page.locator("#amount").blur();
    await page.locator("#matching_symbol").fill("order&id=7");
    await expect(
      page.locator("code").filter({ hasText: "algorand://" }).first(),
    ).toContainText("xnote=order%26id%3D7");
  });
});

test.describe("Payment gateway paid-check", () => {
  test.beforeEach(async ({ page }) => {
    await clearAWalletDB(page);
  });

  test("a malformed amount makes the link invalid", async ({ page }) => {
    await page.goto(
      gatewayUrl(`algorand://${PAY_TO}?amount=1000.5&network=testnet`),
    );
    await expect(
      page.getByText(/not contain an algorand payment address/i).first(),
    ).toBeVisible();
    await expect(page.getByText("Pay using QR code")).toHaveCount(0);
  });

  test("a payment below the requested amount does not mark the order paid", async ({
    page,
  }) => {
    await mockIndexer(page, [transaction(1_999_999)]);
    const searched = page.waitForRequest(/testnet-idx\.algonode\.cloud\/v2\/transactions/, {
      timeout: 20_000,
    });
    await page.goto(
      gatewayUrl(`algorand://${PAY_TO}?amount=2000000&network=testnet&xnote=order-1`),
    );
    await searched;
    await page.waitForTimeout(1500);
    await expect(page.getByText("Payment received")).toHaveCount(0);
    await expect(page.getByText("Pay using QR code")).toBeVisible();
  });

  test("a payment to someone else does not mark the order paid", async ({ page }) => {
    await mockIndexer(page, [
      transaction(5_000_000, "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"),
    ]);
    const searched = page.waitForRequest(/testnet-idx\.algonode\.cloud\/v2\/transactions/, {
      timeout: 20_000,
    });
    await page.goto(
      gatewayUrl(`algorand://${PAY_TO}?amount=2000000&network=testnet&xnote=order-1`),
    );
    await searched;
    await page.waitForTimeout(1500);
    await expect(page.getByText("Payment received")).toHaveCount(0);
  });

  test("the requested amount marks the order paid", async ({ page }) => {
    await mockIndexer(page, [transaction(2_000_000)]);
    await page.goto(
      gatewayUrl(`algorand://${PAY_TO}?amount=2000000&network=testnet&xnote=order-1`),
    );
    await expect(page.getByText("Payment received")).toBeVisible({ timeout: 20_000 });
  });
});
