import { test, expect } from "@playwright/test";
import {
  checkPersistentStorage,
  clearHadWalletMarker,
  hasHadWalletMarker,
  isStorageAtRisk,
  requestPersistentStorage,
  setHadWalletMarker,
} from "../../src/scripts/storagePersistence";

test.describe("requestPersistentStorage", () => {
  test("already persisted: persist() is not called again", async () => {
    let persistCalls = 0;
    const status = await requestPersistentStorage({
      persisted: async () => true,
      persist: async () => {
        persistCalls++;
        return true;
      },
    });
    expect(status).toBe("already");
    expect(persistCalls).toBe(0);
  });

  test("browser grants the request", async () => {
    const status = await requestPersistentStorage({
      persisted: async () => false,
      persist: async () => true,
    });
    expect(status).toBe("granted");
  });

  test("browser refuses: reported as denied and at risk", async () => {
    const status = await requestPersistentStorage({
      persisted: async () => false,
      persist: async () => false,
    });
    expect(status).toBe("denied");
    expect(isStorageAtRisk(status)).toBe(true);
  });

  test("missing API or throwing API is unsupported, never throws", async () => {
    expect(await requestPersistentStorage({})).toBe("unsupported");
    const status = await requestPersistentStorage({
      persisted: async () => {
        throw new Error("SecurityError");
      },
      persist: async () => true,
    });
    expect(status).toBe("unsupported");
    expect(isStorageAtRisk(status)).toBe(false);
  });

  test("granted storage is not at risk", () => {
    expect(isStorageAtRisk("granted")).toBe(false);
    expect(isStorageAtRisk("already")).toBe(false);
  });
});

test.describe("checkPersistentStorage", () => {
  test("never calls persist() and reports the current state", async () => {
    let persistCalls = 0;
    const storage = (persisted: boolean) => ({
      persisted: async () => persisted,
      persist: async () => {
        persistCalls++;
        return true;
      },
    });
    expect(await checkPersistentStorage(storage(true))).toBe("already");
    expect(await checkPersistentStorage(storage(false))).toBe("denied");
    expect(await checkPersistentStorage({})).toBe("unsupported");
    expect(persistCalls).toBe(0);
  });
});

test.describe("had-wallet marker cookie", () => {
  // Minimal cookie jar: assignments set/delete a name, reads join the live cookies.
  function jar() {
    const store = new Map<string, string>();
    return {
      get cookie() {
        return [...store].map(([k, v]) => `${k}=${v}`).join("; ");
      },
      set cookie(raw: string) {
        const [pair, ...attrs] = raw.split(";").map((p) => p.trim());
        const [name, value] = pair.split("=");
        if (attrs.includes("max-age=0")) store.delete(name);
        else store.set(name, value);
      },
    };
  }

  test("absent by default, set after a wallet is used, cleared on destroy", () => {
    const j = jar();
    expect(hasHadWalletMarker(j)).toBe(false);
    setHadWalletMarker(j);
    expect(hasHadWalletMarker(j)).toBe(true);
    clearHadWalletMarker(j);
    expect(hasHadWalletMarker(j)).toBe(false);
  });

  test("an unrelated cookie is not mistaken for the marker", () => {
    expect(hasHadWalletMarker({ cookie: "other=1; awallet_had_wallet_x=1" })).toBe(
      false
    );
  });
});
