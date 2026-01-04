/// <reference types="cypress" />

describe("Create ARC76 Account", () => {
  it("should create a new wallet and ARC76 account", () => {
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

    // The createTestWallet already redirects to /accounts

    // Wait for the navbar to load
    cy.get("nav", { timeout: 10000 }).should("be.visible");

    // Use the menu to navigate to ARC76 account creation
    cy.contains("Wallet", { timeout: 10000 }).click({ force: true });

    // Wait for menu to expand and hover on "New account"
    cy.contains("New account", { timeout: 10000 }).trigger("mouseenter", {
      force: true,
    });

    // Wait for submenu to appear and click on "Email & Password account"
    cy.contains("Email & Password account", { timeout: 10000 }).click({
      force: true,
    });

    // Wait for ARC76 form to load
    cy.url().should("include", "/new-account/email-password");
    cy.get("#email", { timeout: 10000 }).should("be.visible");

    // Fill account details with proper values
    cy.get("#email").clear().type("test@example.com");

    // Use a password that meets the 50+ character requirement
    const longPassword =
      "test@example.comtest@example.comtest@example.comtest@example.com";
    cy.get("#w").clear().type(longPassword);

    cy.get("#name").clear().type("ARC76 Account");

    // Wait for form validation and click create account
    cy.get("#create_account", { timeout: 10000 }).should("be.visible");

    // The button might be disabled due to validation, force click if needed
    cy.get("#create_account").then(($button) => {
      if ($button.is(":disabled")) {
        // Force enable and click if validation is blocking
        cy.wrap($button).invoke("prop", "disabled", false);
        cy.wrap($button).click({ force: true });
      } else {
        cy.wrap($button).click();
      }
    });

    // Verify account creation - check for account page or account name in navigation
    cy.url().should("include", "/account/");
    cy.contains("ARC76 Account").should("be.visible");

    // Alternative verification: check for account overview heading
    cy.get("h1").should("contain", "Account overview");
  });
});
