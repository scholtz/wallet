import { test, expect } from "@playwright/test";
import { setupFreshWallet } from "../support/wallet";

interface StoreLike {
  commit: (type: string) => void;
}
interface AppHost extends Element {
  __vue_app__?: { config: { globalProperties: { $store: StoreLike } } };
}

test.describe("Ledger signing notice", () => {
  test("shows a spinner with instructions while a Ledger signature is pending and hides it afterwards", async ({
    page,
  }) => {
    await setupFreshWallet(page);
    const notice = page.getByTestId("ledger-signing-notice");
    await expect(notice).toHaveCount(0);

    // signByLedger commits these around the device call; real hardware is not
    // available in CI so drive the same mutations directly. Two overlapping
    // requests (SignAll) must keep the notice up until both are done.
    const commit = (type: string) =>
      page.evaluate((t) => {
        const host = document.querySelector("#app") as AppHost | null;
        host?.__vue_app__?.config.globalProperties.$store.commit(t);
      }, type);

    await commit("signer/ledgerPendingStart");
    await commit("signer/ledgerPendingStart");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Confirm on your Ledger");
    await expect(notice.locator(".p-progressspinner")).toBeVisible();

    await commit("signer/ledgerPendingEnd");
    await expect(notice).toBeVisible();
    await commit("signer/ledgerPendingEnd");
    await expect(notice).toHaveCount(0);

    // The user is never trapped: the notice can be hidden while signing keeps waiting,
    // and it reappears for the next signing round.
    await commit("signer/ledgerPendingStart");
    await expect(notice).toBeVisible();
    await page.getByTestId("ledger-signing-hide").click();
    await expect(notice).toHaveCount(0);
    await commit("signer/ledgerPendingEnd");
    await commit("signer/ledgerPendingStart");
    await expect(notice).toBeVisible();
  });
});
