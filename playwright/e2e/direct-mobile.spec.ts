// Biatec Direct popup on phones: layout, tap targets and tap-driven flows.
// Emulation follows Playwright's mobile guidance: a device descriptor (touch, DPR, mobile UA,
// meta-viewport honoured) with the viewport overridden per suite; set before any navigation.
// Chromium only here (the repo installs just Chromium), so real iOS Safari still needs a manual
// check before a release. The popup is a new page of the same context and inherits the emulation.
import { test, expect, devices, type Locator, type Page } from "@playwright/test";
import algosdk from "algosdk";
import { setupFreshWallet } from "../support/wallet";
import {
  MAINNET_HASH,
  connectSite,
  expandAll,
  expectClosed,
  isReady,
  openDapp,
  openPopup,
  paymentTxn,
  post,
  reply,
  unlock,
  waitForMessage,
  walletAddress,
} from "../support/direct";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType: _browser, ...pixel } = devices["Pixel 7"];

/** WCAG 2.5.5 / Apple HIG: touch targets of at least 44x44 CSS px. */
const MIN_TARGET = 44;

const SIZES = [
  { name: "Pixel-class portrait 360x640", viewport: { width: 360, height: 640 }, stacked: true },
  { name: "small phone 320x568", viewport: { width: 320, height: 568 }, stacked: true },
  { name: "phone landscape 740x360", viewport: { width: 740, height: 360 }, stacked: false },
];

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

async function expectTapTarget(locator: Locator, minWidth = MIN_TARGET) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET - 0.5);
  expect(box!.width).toBeGreaterThanOrEqual(minWidth - 0.5);
}

async function expectInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const vp = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
}

for (const size of SIZES) {
  test.describe(`Direct popup on ${size.name}`, () => {
    test.use({ ...pixel, viewport: size.viewport });

    // The CI runner is slow (a popup test takes minutes there): every flow is covered once, on the
    // portrait phone, and the other sizes only add what is specific to them.
    test("locked: the requesting site and the unlock form fit without side-scroll", async ({ context, page }) => {
      test.skip(!size.stacked, "landscape keeps the desktop layout: covered by the connect test");
      await setupFreshWallet(page);
      const dapp = await openDapp(context);
      const popup = await openPopup(context, dapp);
      await expect(popup.getByTestId("direct-unlock-banner")).toBeVisible({ timeout: 60000 });
      await expect(popup.locator("#new_wallet_button_open")).toBeVisible();
      await expectNoHorizontalScroll(popup);
      await expectTapTarget(popup.locator("#new_wallet_button_open"));
    });

    test("connect: sticky, thumb-sized Connect / Reject; approve by tap", async ({ context, page }) => {
      await setupFreshWallet(page);
      const address = walletAddress(page);
      const dapp = await openDapp(context);
      const popup = await openPopup(context, dapp);
      await unlock(popup);
      await waitForMessage(dapp, isReady);
      await post(dapp, {
        id: "m1",
        reference: "arc0027:enable:request",
        params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: { name: "Fixture dApp" } },
      });
      const approve = popup.getByTestId("direct-approve");
      const reject = popup.getByTestId("direct-reject");
      await expect(approve).toBeVisible();
      await expectNoHorizontalScroll(popup);
      await expectTapTarget(approve);
      await expectTapTarget(reject);
      // The footer's brand text is dropped on phones in popup layouts (only the timer remains).
      await expect(popup.locator(".app-footer-minimal .footer-text")).toBeHidden();
      // Sticky actions: on screen even at the top of a page taller than the viewport.
      await popup.evaluate(() => window.scrollTo(0, 0));
      // Stacked (<=640px) layouts pin the actions; wider landscape keeps the inline desktop row.
      if (size.stacked) await expectInViewport(popup, approve);
      await expectTapTarget(popup.locator(".direct-account").first(), 0);
      await approve.tap();
      const response = await waitForMessage(dapp, reply("m1"));
      expect(response.data.error).toBeUndefined();
      expect((response.data.result as { accounts: { address: string }[] }).accounts[0].address).toBe(address);
      await expectClosed(popup);
    });

    test("connect: rejecting by tap answers 4001", async ({ context, page }) => {
      test.skip(size !== SIZES[0], "same flow at every size: covered on the portrait phone");
      await setupFreshWallet(page);
      const dapp = await openDapp(context);
      const popup = await openPopup(context, dapp);
      await unlock(popup);
      await waitForMessage(dapp, isReady);
      await post(dapp, { id: "m2", reference: "arc0027:enable:request", params: { providerId: "d", genesisHash: MAINNET_HASH, metadata: {} } });
      await popup.getByTestId("direct-reject").tap();
      const response = await waitForMessage(dapp, reply("m2"));
      expect((response.data.error as { code: number }).code).toBe(4001);
      await expectClosed(popup);
    });
  });
}

for (const size of [SIZES[0]]) {
  test.describe(`Direct signing on ${size.name}`, () => {
    test.use({ ...pixel, viewport: size.viewport });

    test("the request is a stacked card: summary, fee and big Sign all / Reject, no side-scroll; sign by tap", async ({ context, page }) => {
      test.setTimeout(300_000);
      await setupFreshWallet(page);
      const address = walletAddress(page);
      const dapp = await connectSite(context, address);
      const popup = await openPopup(context, dapp);
      await unlock(popup);
      await waitForMessage(dapp, isReady);
      const first = paymentTxn(address).txn;
      const second = paymentTxn(address).txn;
      algosdk.assignGroupID([first, second]);
      await post(dapp, {
        id: "s1",
        reference: "arc0027:sign_transactions:request",
        params: {
          providerId: "d",
          genesisHash: MAINNET_HASH,
          txns: [first, second].map((t) => ({ txn: Buffer.from(algosdk.encodeUnsignedTransaction(t)).toString("base64url") })),
        },
      });
      const signAll = popup.getByRole("button", { name: "Sign all" });
      const reject = popup.getByRole("button", { name: "Reject" });
      await expect(signAll).toBeVisible();
      await expectNoHorizontalScroll(popup);
      await expectTapTarget(signAll);
      await expectTapTarget(reject);
      // Fee and the buttons sit on their own full-width lines instead of squeezed table cells.
      const fee = await popup.locator("td.direct-fee-column").first().boundingBox();
      const actions = await popup.locator("td.direct-request-actions").first().boundingBox();
      const vp = popup.viewportSize()!;
      expect(fee!.width).toBeGreaterThan(vp.width * 0.7);
      expect(actions!.width).toBeGreaterThan(vp.width * 0.7);
      // Opening the details keeps everything inside the screen width.
      await expandAll(popup);
      await expect(popup.getByRole("cell", { name: "Fee:" }).first()).toBeVisible();
      await expectNoHorizontalScroll(popup);
      for (const sign of await popup.getByRole("button", { name: "Sign", exact: true }).all()) {
        await expectTapTarget(sign);
      }
      await signAll.scrollIntoViewIfNeeded();
      await signAll.tap();
      const response = await waitForMessage(dapp, reply("s1"));
      expect(response.data.error).toBeUndefined();
      expect((response.data.result as { stxns: (string | null)[] }).stxns.every((x) => x !== null)).toBe(true);
    });
  });
}
