declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to clear AWallet IndexedDB database
     */
    clearAWalletDB(): Chainable<void>
    
    /**
     * Custom command for creating a test wallet
     * @param walletName - Name of the wallet (default: 'Test Wallet')
     * @param password - Password for the wallet (default: 'Test Password')
     */
    createTestWallet(walletName?: string, password?: string): Chainable<void>
  }
}