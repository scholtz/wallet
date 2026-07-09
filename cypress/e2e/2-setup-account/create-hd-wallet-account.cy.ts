/// <reference types="cypress" />

describe("Create HD Wallet Account", () => {
  it("should create a new wallet and a second, manually confirmed HD account", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/new-wallet", {
      onBeforeLoad(win: Cypress.AUTWindow) {
        Object.defineProperty(win.navigator, "language", { value: "de-DE" });
      },
    });

    // Wait for page to load and ensure form is visible
    cy.get("#newwallet-name", { timeout: 10000 }).should("be.visible");
    cy.get("#newwallet-pass").should("be.visible");
    cy.get("#new_wallet_button_create").should("be.visible");

    // Create wallet using custom command. This auto-creates a first HD
    // account and lands on its overview page.
    cy.createTestWallet();
    cy.url({ timeout: 15000 }).should("include", "/account/");

    // Wait for the navbar to load
    cy.get(".p-menubar", { timeout: 10000 }).should("be.visible");

    // Use the menu to navigate to HD wallet account creation
    cy.contains("Wallet", { timeout: 10000 }).click({ force: true });
    cy.contains("New account", { timeout: 10000 }).trigger("mouseenter", {
      force: true,
    });
    cy.contains("HD Wallet account", { timeout: 10000 }).click({
      force: true,
    });

    cy.url().should("include", "/new-account/hd-wallet");

    cy.get("#name", { timeout: 10000 }).should("be.visible").type("Second HD Account");

    // Confirm the mnemonic has been backed up so this account is not flagged
    // as unbacked-up like the automatically created first account.
    cy.get("#confirmedBackup").click({ force: true });

    cy.get("#create_hd_account").should("be.visible").click();

    // Verify account creation
    cy.url({ timeout: 15000 }).should("include", "/account/");
    cy.contains("Second HD Account").should("be.visible");
    cy.get("h1").should("contain", "Account overview");

    // Since the user confirmed the backup before creating this account, the
    // "not backed up" warning must not be shown.
    cy.contains("This account is not backed up!").should("not.exist");
  });
});
