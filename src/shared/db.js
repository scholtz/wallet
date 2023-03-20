import Dexie from "dexie";

const db = new Dexie("AWallet");
db.version(4).stores({
  wallets: "++id,name,addr,data",
  wc: "&id,name,addr,data",
});

export default db;
