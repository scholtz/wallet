/// <reference types="cypress" />

describe("Basic Application Load", () => {
  it("should load the index page and display UI elements", () => {
    cy.clearAWalletDB();
    cy.viewport(1920, 1050);
    cy.visit("/");
    // Wait for potential redirect to complete
    cy.location('pathname').should('match', /^\/(new-wallet)?$/);
    cy.get(".p-button").should("be.visible");
  });
});
