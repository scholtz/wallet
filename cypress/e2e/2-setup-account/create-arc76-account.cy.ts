/// <reference types="cypress" />

describe("Create ARC76 Account", () => {
  it("should create a new wallet and ARC76 account", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/new-wallet");
    
    // Wait for page to load and ensure form is visible
    cy.get("#newwallet-name", { timeout: 10000 }).should("be.visible");
    cy.get("#newwallet-pass").should("be.visible");
    cy.get("#new_wallet_button_create").should("be.visible");
    
    // Create wallet using custom command
    cy.createTestWallet();
    
    // Navigate to account creation
    cy.get(".pi-home", { timeout: 10000 })
      .first()
      .should("be.visible")
      .trigger("mouseenter")
      .click();
    
    // Create ARC76 account
    cy.get(".pi-plus", { timeout: 10000 }).first().should("be.visible").trigger("mouseenter");
    cy.get(".pi-at").first().should("be.visible").click();
    
    // Fill account details
    cy.get("#email", { timeout: 10000 }).should("be.visible").type("test@example.com");
    cy.get("#w").should("be.visible").type("test@example.comtest@example.com");
    cy.get("#name").should("be.visible").type("ARC76 Account");
    cy.get("#create_account").should("be.visible").click();
    
    // Verify account creation
    cy.get(".account-qr", { timeout: 15000 }).should("be.visible");
  });
});
