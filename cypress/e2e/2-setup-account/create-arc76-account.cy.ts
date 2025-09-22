/// <reference types="cypress" />

describe("Create ARC76 Account", () => {
  it("should create a new wallet and ARC76 account", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/");
    cy.wait(1000);
    
    // Create wallet using custom command
    cy.createTestWallet();
    
    // Navigate to account creation
    cy.get(".pi-home")
      .first()
      .trigger("mouseenter");
    cy.wait(1000);
    cy.get(".pi-home")
      .first()
      .click();
    cy.wait(2000);
    
    // Create ARC76 account
    cy.get(".pi-plus").first().trigger("mouseenter");
    cy.wait(1000);
    cy.get(".pi-at").first().click();
    cy.wait(2000);
    
    // Fill account details
    cy.get("#email").type("test@example.com");
    cy.get("#w").type("test@example.comtest@example.com");
    cy.get("#name").type("ARC76 Account");
    cy.get("#create_account").click();
    cy.wait(5000);
    
    // Verify account creation
    cy.get(".account-qr", { timeout: 10000 }).should("be.visible");
    cy.wait(1000);
  });
});
