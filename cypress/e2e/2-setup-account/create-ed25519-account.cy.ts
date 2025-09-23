/// <reference types="cypress" />

describe("Create ED25519 Account", () => {
  it("should create a new wallet and ED25519 account", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/new-wallet");
    
    // Wait for page to load and ensure form is visible
    cy.get("#newwallet-name", { timeout: 10000 }).should("be.visible");
    cy.get("#newwallet-pass").should("be.visible");
    cy.get("#new_wallet_button_create").should("be.visible");
    
    // Create wallet using custom command
    cy.createTestWallet();
    
    // Wait for accounts page to load and create account
    cy.get("#create-first", { timeout: 10000 }).should("be.visible").click();
    cy.get("#name", { timeout: 10000 }).should("be.visible").type("Test Account");
    cy.get("#skip_challange").should("be.visible").click();
    
    // Verify account creation
    cy.get(".account-qr", { timeout: 15000 }).should("be.visible");
  });
});
