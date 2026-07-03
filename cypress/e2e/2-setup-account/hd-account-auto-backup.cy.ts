/// <reference types="cypress" />

describe("Auto-created HD account backup flow", () => {
  it("creates an unbacked-up HD account on wallet creation, warns about it, and lets the user mark it as backed up", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/new-wallet", {
      onBeforeLoad(win: Cypress.AUTWindow) {
        Object.defineProperty(win.navigator, "language", { value: "de-DE" });
      },
    });

    cy.get("#newwallet-name", { timeout: 10000 }).should("be.visible");
    cy.get("#newwallet-pass").should("be.visible");
    cy.get("#new_wallet_button_create").should("be.visible");

    cy.createTestWallet();

    // Wallet creation auto-creates a first HD account and redirects straight
    // to its overview page.
    cy.url({ timeout: 15000 }).should("include", "/account/");
    cy.get("h1").should("contain", "Account overview");

    // The freshly auto-created HD account has not been backed up yet, so a
    // big red warning must be shown, linking to the backup/export flow.
    cy.contains("This account is not backed up!").should("be.visible");
    cy.get("#account_overview_back_up_now", { timeout: 10000 })
      .should("be.visible")
      .click();

    cy.url().should("include", "/account/export/");

    // Unlock export with the wallet password.
    cy.get("#pwd", { timeout: 10000 }).should("be.visible").type("TestPassword123");
    cy.contains("Continue").click();

    // Reveal the HD master mnemonic.
    cy.contains("HD Master Mnemonic", { timeout: 10000 }).click();

    // The "mark as backed up" button should be visible while the mnemonic is
    // shown, since the account has not been confirmed as backed up.
    cy.get("#mark_account_backed_up", { timeout: 10000 })
      .should("be.visible")
      .click();

    // Once marked as backed up, the button disappears and the account's
    // overview page no longer shows the red warning.
    cy.get("#mark_account_backed_up").should("not.exist");

    cy.go("back");
    cy.go("back");
    cy.url({ timeout: 15000 }).should("include", "/account/");
    cy.contains("This account is not backed up!").should("not.exist");
  });
});
