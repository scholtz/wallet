import algosdk from "algosdk";

self.addEventListener("message", (e) => {
  const max = 50;
  console.log("starting thread", e);
  for (let i = 0; i < max; i++) {
    let account = algosdk.generateAccount();
    let found = false;
    if (e.data.vanityStart) {
      if (account.addr.startsWith(e.data.vanityStart)) {
        found = true;
      } else {
        continue;
      }
    }
    if (e.data.vanityMid) {
      if (account.addr.indexOf(e.data.vanityMid) >= 0) {
        found = true;
      } else {
        found = false;
        continue;
      }
    }
    if (e.data.vanityEnd) {
      if (account.addr.endsWith(e.data.vanityEnd)) {
        found = true;
      } else {
        found = false;
      }
    }
    if (found) {
      self.postMessage(account);
      i = 1000;
    }
  }
  self.postMessage(max);
});
