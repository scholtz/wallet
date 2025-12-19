import algosdk from "algosdk";

self.addEventListener("message", (e) => {
  const max = 50;
  let matchedAccount = null;

  for (let i = 0; i < max; i++) {
    const account = algosdk.generateAccount();
    const rawAddress = account.addr;
    const address =
      typeof rawAddress === "string"
        ? rawAddress
        : rawAddress?.toString?.() ?? "";

    if (!address) {
      continue;
    }

    let matches = true;

    if (e.data.vanityStart) {
      matches = matches && address.startsWith(e.data.vanityStart);
    }

    if (!matches) {
      continue;
    }

    if (e.data.vanityMid) {
      matches = matches && address.indexOf(e.data.vanityMid) >= 0;
    }

    if (!matches) {
      continue;
    }

    if (e.data.vanityEnd) {
      matches = matches && address.endsWith(e.data.vanityEnd);
    }

    if (!matches) {
      continue;
    }

    matchedAccount = {
      ...account,
      addr: address,
    };
    break;
  }

  if (matchedAccount) {
    self.postMessage(matchedAccount);
  }

  self.postMessage(max);
});
