import { safeJsonParse, safeJsonStringify } from "@walletconnect/safe-json";
import { IKeyValueStorage, parseEntry } from "@walletconnect/keyvaluestorage";

export class WCKeyValueStore implements IKeyValueStorage {
  private readonly dispatch: any;
  public constructor(dispatch: any) {
    this.dispatch = dispatch;
  }

  public async getKeys(): Promise<string[]> {
    const ret = await this.dispatch("wallet/wcGetKeys", null, {
      root: true,
    });
    console.log("getKeys", ret);
    return ret;
  }

  public async getEntries<T = any>(): Promise<[string, T][]> {
    const ret = await this.dispatch("wallet/wcGetEntries", null, {
      root: true,
    });
    console.log("getEntries", ret);
    return ret;
  }

  public async getItem<T = any>(key: string): Promise<T | undefined> {
    const ret = await this.dispatch(
      "wallet/wcGetItem",
      { key },
      {
        root: true,
      }
    );
    console.log("getItem", key, ret);
    return ret;
  }

  public async setItem<T = any>(key: string, value: T): Promise<void> {
    console.log("setItem", key, value);
    return await this.dispatch(
      "wallet/wcSetItem",
      { key, value },
      {
        root: true,
      }
    );
  }

  public async removeItem(key: string): Promise<void> {
    console.log("removeItem", key);
    return await this.dispatch(
      "wallet/wcRemoveItem",
      { key },
      {
        root: true,
      }
    );
  }
}

export default WCKeyValueStore;
