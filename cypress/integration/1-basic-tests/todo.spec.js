/// <reference types="cypress" />

// Welcome to Cypress!
//
// This spec file contains a variety of sample tests
// for a todo list app that are designed to demonstrate
// the power of writing tests in Cypress.
//
// To learn more about how Cypress works and
// what makes it such an awesome testing tool,
// please read our getting started guide:
// https://on.cypress.io/introduction-to-cypress

describe("main", () => {
  it("go to index", () => {
    cy.viewport(1920, 1050);
    cy.visit("/");
    cy.get(".btn-primary").should("be.visible");
  });
});
