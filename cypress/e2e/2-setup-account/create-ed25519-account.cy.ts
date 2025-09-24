/// <reference types="cypress" />

describe("Create ED25519 Account", () => {
  it("should create a new wallet and ED25519 account", () => {
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

    // Create wallet using custom command
    cy.createTestWallet();

    // Wait for accounts page to load and create account
    cy.url().should("include", "/accounts");
    cy.get("#create-first", { timeout: 10000 }).should("be.visible").click();

    // Wait for account creation page
    cy.url().should("include", "/new-account/ed25519");
    cy.get("#name", { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type("Test Account");
    cy.get("#skip_challange").should("be.visible").click();

    // Verify account creation - check for account page navigation or account overview
    cy.url().should("include", "/account/", { timeout: 15000 });
    cy.contains("Test Account").should("be.visible");

    // Alternative verification: check for account overview heading
    cy.get("h1").should("contain", "Account overview");
  });
});
