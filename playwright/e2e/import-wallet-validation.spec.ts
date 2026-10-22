import { test, expect } from "@playwright/test";
import { clearAWalletDB } from "../support/wallet";

// AW-2026-078: importing a file that is not an AWallet backup must be refused up front instead of
// being stored and later reported as "wrong password".

const LEGACY_BACKUP = "U2FsdGVkX1/P98d6R7QllvTWEyp77oEiZ1kkr6NOcNQ=";

test.describe("Import wallet validation (AW-2026-078)", () => {
  test.beforeEach(async ({ page }) => {
    await clearAWalletDB(page);
  });

  test("a file that is not a wallet backup is refused and nothing is stored", async ({
    page,
  }) => {
    await page.goto("/import-wallet");
    await page.locator("#newwallet-name").fill("imported-garbage");
    await page.locator('input[type="file"]').setInputFiles({
      name: "wallet.dat",
      mimeType: "text/plain",
      buffer: Buffer.from("this is definitely not a wallet", "utf8"),
    });
    await page.getByRole("button", { name: "Import wallet" }).click();
    await expect(page.getByText("File is not an AWallet backup").first()).toBeVisible();
    await expect(page).toHaveURL(/\/import-wallet/);

    const stored = await page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const open = indexedDB.open("AWallet");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains("wallets")) {
              db.close();
              resolve(0);
              return;
            }
            const count = db.transaction("wallets").objectStore("wallets").count();
            count.onsuccess = () => {
              db.close();
              resolve(count.result);
            };
            count.onerror = () => reject(count.error);
          };
        }),
    );
    expect(stored).toBe(0);
  });

  test("a well-formed backup is imported and leads to the unlock screen", async ({
    page,
  }) => {
    await page.goto("/import-wallet");
    await page.locator("#newwallet-name").fill("imported-ok");
    await page.locator('input[type="file"]').setInputFiles({
      name: "wallet.dat",
      mimeType: "text/plain",
      buffer: Buffer.from(`${LEGACY_BACKUP}\n`, "utf8"),
    });
    await page.getByRole("button", { name: "Import wallet" }).click();
    await expect(page).not.toHaveURL(/\/import-wallet/);
  });
});
