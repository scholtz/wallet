import { test, expect } from "@playwright/test";
import { DEFAULT_WALLET_PASSWORD, setupFreshWallet } from "../support/wallet";

test("auto-created HD account warns about missing backup and can be marked as backed up", async ({
  page,
}) => {
  await setupFreshWallet(page);

  await expect(page.getByText("This account is not backed up!")).toBeVisible();
  await page.locator("#account_overview_back_up_now").click();
  await expect(page).toHaveURL(/\/account\/export\//);

  await page.locator("#pwd").fill(DEFAULT_WALLET_PASSWORD);
  await page.getByText("Continue", { exact: true }).click();

  await page.getByText("HD Master Mnemonic").first().click();
  await page.locator("#mark_account_backed_up").click();
  await expect(page.locator("#mark_account_backed_up")).toHaveCount(0);

  // In-app history navigation keeps the unlocked session (no page reload).
  await page.goBack();
  await expect(page).toHaveURL(/\/account\//);
  await expect(page.getByText("This account is not backed up!")).toHaveCount(0);
});

test("export with a wrong wallet password does not reveal the mnemonic", async ({
  page,
}) => {
  await setupFreshWallet(page);
  await page.locator("#account_overview_back_up_now").click();
  await expect(page).toHaveURL(/\/account\/export\//);
  await page.locator("#pwd").fill("definitely-wrong-password");
  await page.getByText("Continue", { exact: true }).click();
  await expect(page.getByText("HD Master Mnemonic")).toHaveCount(0);
  await expect(page.locator("#mark_account_backed_up")).toHaveCount(0);
});
