import { test, expect } from "@playwright/test";
import { clearAWalletDB, createTestWallet } from "../support/wallet";

const WALLET_PASSWORD = "TestPassword123";

test("create basic ed25519 account, verify mnemonic export, back up via 2-of-3 Shamir, delete, and recover from first + last shard", async ({
  page,
}) => {
  await clearAWalletDB(page);

  await page.goto("/new-wallet");
  await createTestWallet(page, "Test Wallet", WALLET_PASSWORD);
  await expect(page.locator("nav")).toBeVisible();

  // --- Create a basic ed25519 account (first account, so via #create-first) ---
  await expect(page).toHaveURL(/\/accounts/);
  await page.locator("#create-first").click();

  await expect(page).toHaveURL(/\/new-account\/ed25519/);
  const createdMnemonic = await page
    .locator(".p-password input")
    .first()
    .inputValue();
  expect(createdMnemonic.split(" ")).toHaveLength(25);

  await page.locator("#name").fill("Basic Account");
  await page.locator("#skip_challange").click();

  await page.waitForURL(/\/account\//, { timeout: 15000 });
  const accountAddress = page.url().split("/account/")[1];
  await expect(page.locator("h1")).toContainText("Basic Account");
  await expect(page.locator("h1")).toContainText("Account overview");

  // --- Show account detail (Overview tab, already here). The full address
  // text on this page only renders once the account's indexer data has
  // loaded (AccountOverview.vue gates it behind `v-if="account &&
  // accountData"`, populated by a live mainnet indexer call) - that's not
  // guaranteed to resolve in a test environment, so assert against the
  // account tab-menu link instead, which reflects local wallet state only.
  await expect(
    page.locator(`.p-tabmenu a[href="/account/${accountAddress}"]`)
  ).toBeVisible();

  // --- List transactions via the in-app account tab (not page.goto - a
  // full reload would log the unlocked wallet back out) ---
  await page
    .locator(".p-tabmenu")
    .getByText("Transactions", { exact: true })
    .click({ force: true });
  await expect(page).toHaveURL(/\/account\/txs\//);
  await expect(page.locator(".p-datatable")).toBeVisible();

  // --- Export the account as a plain Algorand mnemonic and compare it to
  // the mnemonic shown at account creation time ---
  await page
    .locator(".p-tabmenu")
    .getByText("Actions", { exact: true })
    .click({ force: true });
  await expect(page).toHaveURL(/\/account\/actions\//);
  // The Export action is a Button nested inside a RouterLink <a> - invalid
  // nested-interactive HTML that Chromium's a11y tree collapses to just the
  // link role, so getByRole("button") never matches it.
  await page
    .locator('.p-card a[href*="/account/export/"]')
    .click({ force: true });

  await expect(page).toHaveURL(/\/account\/export\//);
  await page.locator("#pwd").fill(WALLET_PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .getByRole("button", { name: "Algorand mnemonic", exact: true })
    .click();
  const exportedMnemonic = await page.locator("code").innerText();
  expect(exportedMnemonic.trim()).toEqual(createdMnemonic.trim());

  // --- Back up the same account via Shamir, requiring 2 of 3 shards ---
  await page
    .getByRole("button", { name: "Shamir backup", exact: true })
    .click();
  await page.locator("#shamirMin").fill("2");
  await page.locator("#shamirCount").fill("3");
  await page
    .getByRole("button", { name: "Generate shamir mnemonics", exact: true })
    .click();

  const shardCode = page.locator("code");
  await expect(shardCode).toBeVisible();
  const firstShard = (await shardCode.innerText()).trim();
  // Shamir shard mnemonics encode a 33-byte shard (32-byte share + framing
  // byte), one word longer than the standard 25-word account mnemonic.
  expect(firstShard.split(" ")).toHaveLength(26);

  // Move to the last (3rd) shard.
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const lastShard = (await shardCode.innerText()).trim();
  expect(lastShard.split(" ")).toHaveLength(26);
  expect(lastShard).not.toEqual(firstShard);

  // --- Delete the account. Export.vue has no account tab bar to click, so
  // use SPA history back (Vue Router intercepts popstate - no full reload,
  // unlike page.goto, which would log the unlocked wallet back out) to
  // return to the account overview. ---
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(`/account/${accountAddress}`);
  await expect(page.locator("h1")).toContainText("Basic Account");

  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete this account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/accounts/);
  await expect(page.getByRole("cell", { name: accountAddress })).toHaveCount(
    0
  );

  // --- Recreate the account from the first and last Shamir shards ---
  await page.getByText("Wallet", { exact: true }).click({ force: true });
  await page.getByText("New account", { exact: true }).hover({ force: true });
  await page
    .getByText("Shamir backup recovery", { exact: true })
    .click({ force: true });

  await expect(page).toHaveURL(/\/new-account\/shamir/);
  await page.locator("#mn0").fill(firstShard);
  await page
    .getByRole("button", { name: "Add mnemonic", exact: true })
    .click();
  await page.locator("#mn1").fill(lastShard);
  await page.locator("#name").fill("Recovered Account");
  await page.getByRole("button", { name: "Recover", exact: true }).click();

  await expect(page).toHaveURL(/\/accounts/);
  await expect(
    page.getByRole("cell", { name: "Recovered Account" })
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: accountAddress })
  ).toBeVisible();
});
