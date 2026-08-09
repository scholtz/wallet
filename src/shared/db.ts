import Dexie, { type Table } from "dexie";

export interface WalletRecord {
  id?: number;
  name: string;
  data: string;
}

// The "wc" table's schema (WalletConnect-related persisted key/value rows)
// is not currently read/written anywhere in the app (only "wallets" is used
// via src/store/wallet.ts) - kept typed to its indexed columns only.
export interface WcRecord {
  id: string;
  name: string;
}

class AWalletDb extends Dexie {
  wallets!: Table<WalletRecord, number>;
  wc!: Table<WcRecord, string>;

  constructor() {
    super("AWallet");
    this.version(6).stores({
      wallets: "++id,name",
      wc: "&id,name",
    });
  }
}

const db = new AWalletDb();

export default db;
