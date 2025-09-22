/// <reference types="cypress" />

describe("Create ED25519 Account", () => {
  it("should create a new wallet and ED25519 account", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/");
    cy.wait(1000);
    
    // Create wallet using custom command
    cy.createTestWallet();
    
    // Create account
    cy.get("#create-first").click();
    cy.wait(1000);
    cy.get("#name").type("Test Account");
    cy.get("#skip_challange").click();
    cy.wait(5000);
    
    // Verify account creation
    cy.get(".account-qr", { timeout: 10000 }).should("be.visible");
    cy.wait(1000);
  });
});
