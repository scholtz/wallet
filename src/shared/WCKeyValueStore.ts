import type { Dispatch } from "vuex";
import type { IKeyValueStorage } from "@walletconnect/keyvaluestorage";

export class WCKeyValueStore implements IKeyValueStorage {
  // Vuex's own `Dispatch` type (see node_modules/vuex/types/index.d.ts) is
  // itself untyped for payload/return (`(type: string, payload?: any, ...)
  // => Promise<any>`) - that's the real, complete type of a Vuex action
  // dispatcher, not a gap of our own. `getKeys`/`getEntries`/`getItem`/
  // `setItem` below cast each dispatch's `Promise<any>` result down to the
  // specific, real return type documented by IKeyValueStorage instead of
  // propagating `any` further.
  private readonly dispatch: Dispatch;
  public constructor(dispatch: Dispatch) {
    this.dispatch = dispatch;
  }

  public async getKeys(): Promise<string[]> {
    const ret: string[] = await this.dispatch("wallet/wcGetKeys", null, {
      root: true,
    });
    return ret;
  }

  public async getEntries<T = unknown>(): Promise<[string, T][]> {
    const ret: [string, T][] = await this.dispatch(
      "wallet/wcGetEntries",
      null,
      {
        root: true,
      }
    );
    return ret;
  }

  public async getItem<T = unknown>(key: string): Promise<T | undefined> {
    const ret: T | undefined = await this.dispatch(
      "wallet/wcGetItem",
      { key },
      {
        root: true,
      }
    );
    return ret;
  }

  public async setItem<T = unknown>(key: string, value: T): Promise<void> {
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
