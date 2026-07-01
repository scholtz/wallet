/// <reference types="cypress" />

describe("Create HD Wallet Account", () => {
  it("should create a new wallet, HD account, and generate a next iteration", () => {
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

    // Wait for the navbar to load
    cy.get("nav", { timeout: 10000 }).should("be.visible");

    // Use the menu to navigate to HD wallet account creation
    cy.contains("Wallet", { timeout: 10000 }).click({ force: true });
    cy.contains("New account", { timeout: 10000 }).trigger("mouseenter", {
      force: true,
    });
    cy.contains("HD Wallet account", { timeout: 10000 }).click({
      force: true,
    });

    // Wait for HD wallet form to load - defaults to "create new mnemonic" mode
    cy.url().should("include", "/new-account/hd-wallet");
    cy.get("#confirmedBackup", { timeout: 10000 }).should("be.visible");

    // Confirm the mnemonic has been backed up and fill account name
    cy.get("#confirmedBackup").click({ force: true });
    cy.get("#name").clear().type("HD Root Account");

    cy.get("#create_hd_account", { timeout: 10000 }).should("be.visible");
    cy.get("#create_hd_account").click();

    // Verify first (root) account creation
    cy.url().should("include", "/account/", { timeout: 15000 });
    cy.contains("HD Root Account").should("be.visible");
    cy.get("h1").should("contain", "Account overview");

    cy.url().then((url) => {
      const rootAddress = url.split("/account/")[1];

      // Navigate to account actions and open "Generate next HD account"
      cy.visit("/account/actions/" + rootAddress);
      cy.contains("Generate next HD account", { timeout: 10000 }).click({
        force: true,
      });

      cy.url().should("include", "/account/hd-next/");
      cy.get("#name", { timeout: 10000 })
        .should("be.visible")
        .clear()
        .type("HD Account 1");
      cy.get("#generate_hd_account", { timeout: 10000 })
        .should("be.visible")
        .click();

      // Verify the second (derived) account was created with a different address
      cy.url().should("include", "/account/", { timeout: 15000 });
      cy.contains("HD Account 1").should("be.visible");
      cy.url().should((newUrl) => {
        const childAddress = newUrl.split("/account/")[1];
        expect(childAddress).not.to.eq(rootAddress);
      });
    });
  });
});
