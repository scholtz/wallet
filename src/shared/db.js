import Dexie from "dexie";

const db = new Dexie("AWallet");
db.version(3).stores({
  wallets: "++id,name,addr,data",
  wc: "&id,name,addr,auth,data",
});

export default db;
