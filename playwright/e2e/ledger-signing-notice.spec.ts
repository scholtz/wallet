import { test, expect } from "@playwright/test";
import { setupFreshWallet } from "../support/wallet";

interface StoreLike {
  commit: (type: string, payload?: number) => void;
  dispatch: (type: string) => Promise<void>;
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
    const commit = (type: string, id?: number) =>
      page.evaluate(([t, i]) => {
        const host = document.querySelector("#app") as AppHost | null;
        host?.__vue_app__?.config.globalProperties.$store.commit(t, i);
      }, [type, id] as [string, number | undefined]);

    await commit("signer/ledgerPendingStart", 1);
    await commit("signer/ledgerPendingStart", 2);
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Confirm on your Ledger");
    await expect(notice.locator(".p-progressspinner")).toBeVisible();

    await commit("signer/ledgerPendingEnd", 1);
    await expect(notice).toBeVisible();
    await commit("signer/ledgerPendingEnd", 2);
    await expect(notice).toHaveCount(0);

    // The user is never trapped: the notice can be hidden while signing keeps
    // waiting, and a newly started request (next of a batch) shows it again.
    await commit("signer/ledgerPendingStart", 3);
    await expect(notice).toBeVisible();
    await page.getByTestId("ledger-signing-hide").click();
    await expect(notice).toHaveCount(0);
    await commit("signer/ledgerPendingStart", 4);
    await expect(notice).toBeVisible();

    // A stale id (e.g. one that outlived a reset) cannot end another request's notice.
    await commit("signer/ledgerPendingEnd", 99);
    await expect(notice).toBeVisible();

    // Logging out while a request is pending must not leave the notice over the login screen.
    await page.evaluate(() => {
      const host = document.querySelector("#app") as AppHost | null;
      return host?.__vue_app__?.config.globalProperties.$store.dispatch(
        "wallet/logout",
      );
    });
    await expect(page.locator("#new_wallet_button_open")).toBeVisible();
    await expect(notice).toHaveCount(0);
  });
});
