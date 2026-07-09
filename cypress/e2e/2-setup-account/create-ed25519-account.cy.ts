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

    // Wallet creation now auto-creates a first HD account and lands on its
    // overview page, so create a second (ED25519) account via the nav menu.
    cy.url().should("include", "/account/");

    // Wait for the navbar to load
    cy.get(".p-menubar", { timeout: 10000 }).should("be.visible");

    // Use the menu to navigate to ED25519 account creation
    cy.contains("Wallet", { timeout: 10000 }).click({ force: true });
    cy.contains("New account", { timeout: 10000 }).trigger("mouseenter", {
      force: true,
    });
    cy.contains("Create basic account", { timeout: 10000 }).click({
      force: true,
    });

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
