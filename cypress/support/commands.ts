// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to clear AWallet database
Cypress.Commands.add('clearAWalletDB', () => {
  cy.window().then((win) => {
    win.indexedDB.deleteDatabase('AWallet');
  });
});

// Custom command for creating a test wallet
Cypress.Commands.add('createTestWallet', (walletName: string = 'Test Wallet', password: string = 'Test Password') => {
  cy.get('#newwallet-pass').type(password);
  cy.wait(1000);
  cy.get('#newwallet-name').type(walletName);
  cy.get('#new_wallet_button_create').click();
  cy.wait(1000);
});
