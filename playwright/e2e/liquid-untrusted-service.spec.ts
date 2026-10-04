import { test, expect } from "@playwright/test";
import { setupFreshWallet } from "../support/wallet";
import type { Router } from "vue-router";

type WalletElement = HTMLElement & {
  __vue_app__: { config: { globalProperties: { $router: Router } } };
};

/** Fresh wallet, then the Connect page's initialized Liquid Auth tab (in-app navigation). */
async function openLiquidTab(page: import("@playwright/test").Page) {
  await setupFreshWallet(page);
  await page.evaluate(async () => {
    const { $router: router } = (document.querySelector("#app") as WalletElement)
      .__vue_app__.config.globalProperties;
    await router.push("/connect");
  });
  await page.getByRole("tab", { name: "Liquid Auth" }).click();
  await page
    .getByRole("button", { name: "Initialize Liquid Auth", exact: true })
    .click();
  await expect(page.locator("#uriLiquid")).toBeVisible();
}

test("a liquid:// link to an untrusted service is refused before anything is sent to it (AW-2026-049)", async ({
  page,
}) => {
  test.setTimeout(180000);
  const contacted: string[] = [];
  await page.route(/https:\/\/(evil|liquid)\.[a-z.]+\//, (route) => {
    contacted.push(route.request().url());
    return route.abort();
  });
  await openLiquidTab(page);

  await page
    .locator("#uriLiquid")
    .fill("liquid://evil.example/?requestId=11111111-1111-1111-1111-111111111111");
  await page.getByRole("button", { name: "Connect with passkey" }).click();

  await expect(page.locator(".p-toast-message-error").first()).toContainText(
    "untrusted Liquid Auth service",
    { timeout: 30000 },
  );
  expect(contacted).toEqual([]);
});

test("a link with a port, credentials or an IP address is refused too", async ({
  page,
}) => {
  test.setTimeout(180000);
  const contacted: string[] = [];
  await page.route(/https:\/\/(user|10\.|liquid\.biatec)/, (route) => {
    contacted.push(route.request().url());
    return route.abort();
  });
  await openLiquidTab(page);

  for (const link of [
    "liquid://liquid.biatec.io:8443/?requestId=22222222-2222-2222-2222-222222222222",
    "liquid://user:pw@liquid.biatec.io/?requestId=33333333-3333-3333-3333-333333333333",
    "liquid://10.0.0.5/?requestId=44444444-4444-4444-4444-444444444444",
  ]) {
    await page.locator("#uriLiquid").fill(link);
    await page.getByRole("button", { name: "Connect with passkey" }).click();
    await expect(page.locator(".p-toast-message-error").first()).toBeVisible({
      timeout: 30000,
    });
    // Dismiss before the next attempt so the next toast is a new one.
    await page.locator(".p-toast-close-button").first().click();
  }
  expect(contacted).toEqual([]);
});
