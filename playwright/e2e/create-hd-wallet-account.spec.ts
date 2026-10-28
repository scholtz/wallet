import { test, expect } from "@playwright/test";
import {
  DEFAULT_WALLET_PASSWORD,
  chooseNewAccountMenuItem,
  setupFreshWallet,
} from "../support/wallet";

test("create a wallet and a second, manually confirmed HD account", async ({
  page,
}) => {
  await setupFreshWallet(page);
  await expect(page.locator(".p-menubar")).toBeVisible();

  await chooseNewAccountMenuItem(page, "HD Wallet account");
  await expect(page).toHaveURL(/\/new-account\/hd-wallet/);
  await page.locator("#name").fill("Second HD Account");
  // Confirming the backup up front means no "not backed up" warning later.
  await page.locator("#confirmedBackup").click({ force: true });
  await page.locator("#create_hd_account").click();

  await page.waitForURL(/\/account\//, { timeout: 15000 });
  await expect(page.locator("h1")).toContainText("Second HD Account");
  await expect(page.locator("h1")).toContainText("Account overview");
  await expect(page.getByText("This account is not backed up!")).toHaveCount(0);
});

// Regression AW-2026-080: create mode used to show one phrase and store another.
test("the mnemonic shown in create mode is the one that gets stored and exported", async ({
  page,
}) => {
  await setupFreshWallet(page);
  await chooseNewAccountMenuItem(page, "HD Wallet account");
  await expect(page).toHaveURL(/\/new-account\/hd-wallet/);

  const cards = page.locator(".hd-mnemonic-card");
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(0);
  for (let i = 0; i < cardCount; i++) {
    await cards.nth(i).click();
  }
  const shown: string[] = [];
  for (let i = 0; i < cardCount; i++) {
    const text = await cards.nth(i).innerText();
    for (const line of text.split("\n")) {
      const match = line.trim().match(/^\d+:\s*(\S+)$/);
      if (match) shown.push(match[1]);
    }
  }
  expect(shown).toHaveLength(24);

  await page.locator("#name").fill("Backed Up HD");
  await page.locator("#confirmedBackup").click({ force: true });
  await page.locator("#create_hd_account").click();
  await page.waitForURL(/\/account\//, { timeout: 15000 });

  await page.getByText("Actions", { exact: true }).first().click();
  await page.getByRole("link", { name: /Export/ }).first().click();
  await expect(page).toHaveURL(/\/account\/export\//);
  await page.locator("#pwd").fill(DEFAULT_WALLET_PASSWORD);
  await page.getByText("Continue", { exact: true }).click();
  await page.getByText("HD Master Mnemonic").first().click();

  const exported = (await page.locator("code").first().innerText()).trim();
  expect(exported.split(/\s+/)).toEqual(shown);
});
