import { test, expect } from "@playwright/test";
import {
  isStorageAtRisk,
  requestPersistentStorage,
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
