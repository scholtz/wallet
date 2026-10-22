import { test, expect, type Page } from "@playwright/test";
import { clearAWalletDB } from "../support/wallet";

// AW-2026-076: /gateway decodes a payment URI and redirect settings from the URL, so a crafted
// link must never put a script URL in a clickable href, and must not rewrite the node settings.

const PAY_TO = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";
const b64 = (value: string) =>
  encodeURIComponent(Buffer.from(value, "utf8").toString("base64"));

const gatewayUrl = (uri: string, settings?: Record<string, unknown>) =>
  `/gateway/${b64(uri)}` + (settings ? `/${b64(JSON.stringify(settings))}` : "");

// The page polls an indexer; keep the spec offline and deterministic.
const blockNetwork = async (page: Page) => {
  await page.route(/nodely\.dev|algonode\.cloud|a-wallet\.net|biatec\.io/, (route) =>
    route.abort(),
  );
};

test.describe("Payment gateway URL validation (AW-2026-076)", () => {
  test.beforeEach(async ({ page }) => {
    await clearAWalletDB(page);
    await blockNetwork(page);
  });

  test("a javascript: payment link is refused and never becomes an href", async ({
    page,
  }) => {
    await page.goto(gatewayUrl("javascript:alert(document.domain)"));
    await expect(page.getByText(/not contain an algorand payment address/i).first()).toBeVisible();
    await expect(page.locator('a[href^="javascript:" i]')).toHaveCount(0);
    await expect(page.locator('a[title^="javascript:" i]')).toHaveCount(0);
    await expect(page.getByText(/Pay using/i)).toHaveCount(0);
  });

  test("a plain https link is refused as a payment link too", async ({ page }) => {
    await page.goto(gatewayUrl("https://evil.example/phish"));
    await expect(page.getByText(/not contain an algorand payment address/i).first()).toBeVisible();
    await expect(page.locator('a[href^="https://evil.example"]')).toHaveCount(0);
  });

  test("a valid payment link renders its pay links; unsafe cancel/success URLs are dropped", async ({
    page,
  }) => {
    await page.goto(
      gatewayUrl(`algorand://${PAY_TO}?amount=1000000&network=testnet`, {
        cancel: "javascript:alert(1)",
        success: "javascript:alert(2)",
      }),
    );
    await expect(page.getByText("Pay using QR code")).toBeVisible();
    await expect(page.locator(`a[href^="algorand://${PAY_TO}"]`).first()).toBeVisible();
    await expect(page.locator('a[href^="javascript:" i]')).toHaveCount(0);
    await expect(page.getByText("Cancel payment")).toHaveCount(0);
    await expect(page.locator('form[action^="javascript:" i]')).toHaveCount(0);
  });

  test("a safe https cancel URL is offered", async ({ page }) => {
    await page.goto(
      gatewayUrl(`algorand://${PAY_TO}?amount=1000000`, {
        cancel: "https://shop.example/cancel",
      }),
    );
    await expect(page.locator('a[href="https://shop.example/cancel"]')).toBeVisible();
  });

  test("opening a gateway link does not rewrite the persisted node settings", async ({
    page,
  }) => {
    await page.goto("/faq");
    await page.evaluate(() => {
      localStorage.setItem("algodHost", "https://my-own-node.example");
      localStorage.setItem("indexerHost", "https://my-own-indexer.example");
    });
    await page.goto(gatewayUrl(`algorand://${PAY_TO}?amount=1000000&network=testnet`));
    await expect(page.getByText("Pay using QR code")).toBeVisible();
    const stored = await page.evaluate(() => ({
      algod: localStorage.getItem("algodHost"),
      indexer: localStorage.getItem("indexerHost"),
    }));
    expect(stored).toEqual({
      algod: "https://my-own-node.example",
      indexer: "https://my-own-indexer.example",
    });
  });
});
