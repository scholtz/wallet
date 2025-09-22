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
  // Ensure elements are visible before interacting
  cy.get('#newwallet-pass').should('be.visible').type(password);
  cy.get('#newwallet-name').should('be.visible').type(walletName);
  cy.get('#new_wallet_button_create').should('be.visible').click();
  
  // Wait for navigation after wallet creation
  cy.url().should('not.include', '/new-wallet');
});
