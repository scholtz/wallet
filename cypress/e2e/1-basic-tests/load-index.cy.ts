/// <reference types="cypress" />

describe("Basic Application Load", () => {
  it("should load the index page and display UI elements", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/");
    // Wait for potential redirect to complete and page to load
    cy.location('pathname').should('match', /^\/(new-wallet)?$/);
    // Wait for page to be fully loaded
    cy.get("body").should("be.visible");
    // Check for p-button elements with a reasonable timeout
    cy.get(".p-button", { timeout: 10000 }).should("be.visible");
  });
});
