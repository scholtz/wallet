import Dexie from "dexie";

const db = new Dexie("AWallet");
db.version(6).stores({
  wallets: "++id,name",
  wc: "&id,name",
});

export default db;
