import type { IKeyValueStorage } from "@walletconnect/keyvaluestorage";

export class WCKeyValueStore implements IKeyValueStorage {
  private readonly dispatch: any;
  public constructor(dispatch: any) {
    this.dispatch = dispatch;
  }

  public async getKeys(): Promise<string[]> {
    const ret = await this.dispatch("wallet/wcGetKeys", null, {
      root: true,
    });
    return ret;
  }

  public async getEntries<T = any>(): Promise<[string, T][]> {
    const ret = await this.dispatch("wallet/wcGetEntries", null, {
      root: true,
    });
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
    return ret;
  }

  public async setItem<T = any>(key: string, value: T): Promise<void> {
    return await this.dispatch(
      "wallet/wcSetItem",
      { key, value },
      {
        root: true,
      }
    );
  }

  public async removeItem(key: string): Promise<void> {
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
