/// <reference lib="webworker" />
import algosdk from "algosdk";

declare const self: DedicatedWorkerGlobalScope;
export default null;

interface VanityWorkerPayload {
  vanityStart?: string;
  vanityMid?: string;
  vanityEnd?: string;
}

type GeneratedAccount = ReturnType<typeof algosdk.generateAccount>;
type WorkerAccount = Omit<GeneratedAccount, "addr"> & { addr: string };

type AddressObject = {
  publicKey?: Uint8Array | number[];
  toString?: () => string;
};

const toUint8Array = (input?: Uint8Array | number[]): Uint8Array | null => {
  if (!input) {
    return null;
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  if (Array.isArray(input)) {
    return Uint8Array.from(input);
  }
  return null;
};

const normalizeAddress = (addr: unknown): string | null => {
  if (typeof addr === "string") {
    return addr;
  }

  if (!addr || typeof addr !== "object") {
    return null;
  }

  const maybeAddress = addr as AddressObject;

  if (typeof maybeAddress.toString === "function") {
    const stringValue = maybeAddress.toString();
    if (typeof stringValue === "string" && stringValue !== "[object Object]") {
      return stringValue;
    }
  }

  if (maybeAddress.publicKey) {
    const array = toUint8Array(maybeAddress.publicKey);
    if (array) {
      try {
        return algosdk.encodeAddress(array);
      } catch {
        return null;
      }
    }
  }

  return null;
};

const matchesPattern = (
  address: string,
  { vanityStart, vanityMid, vanityEnd }: VanityWorkerPayload
): boolean => {
  if (vanityStart && !address.startsWith(vanityStart)) {
    return false;
  }

  if (vanityMid && address.indexOf(vanityMid) < 0) {
    return false;
  }

  if (vanityEnd && !address.endsWith(vanityEnd)) {
    return false;
  }

  return true;
};

self.addEventListener("message", (event: MessageEvent<VanityWorkerPayload>) => {
  const payload = event.data || {};
  const max = 50;
  let matchedAccount: WorkerAccount | null = null;

  for (let i = 0; i < max; i++) {
    const account = algosdk.generateAccount();
    const address = normalizeAddress(account.addr);

    if (!address) {
      continue;
    }

    if (matchesPattern(address, payload)) {
      matchedAccount = {
        ...account,
        addr: address,
      };
      break;
    }
  }

  if (matchedAccount) {
    self.postMessage(matchedAccount);
  }

  self.postMessage(max);
});
