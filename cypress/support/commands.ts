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
    return new Cypress.Promise((resolve) => {
      const deleteRequest = win.indexedDB.deleteDatabase('AWallet');
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Resolve even on error to prevent hanging
      deleteRequest.onblocked = () => resolve(); // Resolve if blocked
      // Fallback timeout
      setTimeout(() => resolve(), 1000);
    });
  });
});

// Custom command for creating a test wallet
Cypress.Commands.add('createTestWallet', (walletName: string = 'Test Wallet', password: string = 'TestPassword123') => {
  // Ensure elements are visible before interacting
  cy.get('#newwallet-name').should('be.visible').clear().type(walletName);
  cy.get('#newwallet-pass').should('be.visible').clear().type(password);
  
  // Wait a moment for password strength indicator to settle
  cy.wait(500);
  
  // Scroll button into view and click with force if needed to handle overlapping elements
  cy.get('#new_wallet_button_create')
    .should('be.visible')
    .scrollIntoView()
    .click({ force: true });
  
  // Wait for navigation after wallet creation
  cy.url().should('not.include', '/new-wallet');
});
