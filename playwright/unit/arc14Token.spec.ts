// Node-only unit tests for the stored ARC-14 login: which stored token may be reused, and how the
// accounts that cannot sign in place (multisig, Ledger) get one.
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  arc14TokenFromSigned,
  isArc14TokenUsable,
  parseArc14Token,
  ARC14_REUSE_MARGIN_ROUNDS,
  BIATEC_ROUTER_REALM,
} from "../../src/scripts/encoding/arc14";
import {
  resolveArc14AuthRoute,
  signAllReturnLabelKey,
} from "../../src/scripts/signing/complexSigning";

const GENESIS_HASH = Buffer.from(
  "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
  "base64",
);

const login = (
  sender: string,
  opts: { realm?: string; firstValid?: bigint; lastValid?: bigint } = {},
) =>
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount: 0,
    note: new Uint8Array(Buffer.from(opts.realm ?? BIATEC_ROUTER_REALM)),
    suggestedParams: {
      fee: 0n,
      flatFee: true,
      minFee: 1000n,
      firstValid: opts.firstValid ?? 1000n,
      lastValid: opts.lastValid ?? 2000n,
      genesisHash: GENESIS_HASH,
      genesisID: "mainnet-v1.0",
    },
  });

test.describe("isArc14TokenUsable", () => {
  const acct = algosdk.generateAccount();
  const addr = acct.addr.toString();
  const token = (txn: algosdk.Transaction) =>
    arc14TokenFromSigned(txn.signTxn(acct.sk));

  test("a complete, current login of the account for the realm is reusable", () => {
    expect(
      isArc14TokenUsable(token(login(addr)), addr, BIATEC_ROUTER_REALM, 1500n),
    ).toBe(true);
  });

  test("it is not reusable shortly before it expires, or after", () => {
    const t = token(login(addr));
    expect(
      isArc14TokenUsable(t, addr, BIATEC_ROUTER_REALM, 2000n - ARC14_REUSE_MARGIN_ROUNDS),
    ).toBe(true);
    expect(
      isArc14TokenUsable(
        t,
        addr,
        BIATEC_ROUTER_REALM,
        2000n - ARC14_REUSE_MARGIN_ROUNDS + 1n,
      ),
    ).toBe(false);
    expect(isArc14TokenUsable(t, addr, BIATEC_ROUTER_REALM, 2500n)).toBe(false);
  });

  test("it is not reusable before it becomes valid", () => {
    expect(
      isArc14TokenUsable(token(login(addr)), addr, BIATEC_ROUTER_REALM, 10n),
    ).toBe(false);
  });

  test("another account or another realm does not match", () => {
    const t = token(login(addr));
    expect(
      isArc14TokenUsable(t, algosdk.generateAccount().addr.toString(), BIATEC_ROUTER_REALM, 1500n),
    ).toBe(false);
    expect(isArc14TokenUsable(t, addr, "Other#ARC14", 1500n)).toBe(false);
  });

  test("something that is not a login is never reusable", () => {
    const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: addr,
      receiver: algosdk.generateAccount().addr,
      amount: 1,
      note: new Uint8Array(Buffer.from(BIATEC_ROUTER_REALM)),
      suggestedParams: {
        fee: 0n,
        flatFee: true,
        minFee: 1000n,
        firstValid: 1000n,
        lastValid: 2000n,
        genesisHash: GENESIS_HASH,
        genesisID: "mainnet-v1.0",
      },
    });
    expect(
      isArc14TokenUsable(token(payment), addr, BIATEC_ROUTER_REALM, 1500n),
    ).toBe(false);
    expect(isArc14TokenUsable("SigTx not-base64!", addr, BIATEC_ROUTER_REALM, 1500n)).toBe(false);
    expect(isArc14TokenUsable("Bearer abc", addr, BIATEC_ROUTER_REALM, 1500n)).toBe(false);
    expect(isArc14TokenUsable(undefined, addr, BIATEC_ROUTER_REALM, 1500n)).toBe(false);
  });

  test("a multisig login is reusable only at its threshold", () => {
    const a = algosdk.generateAccount();
    const b = algosdk.generateAccount();
    const params = {
      version: 1,
      threshold: 2,
      addrs: [a.addr, b.addr],
    };
    const msig = algosdk.multisigAddress(params).toString();
    const txn = login(msig);
    const half = algosdk.signMultisigTransaction(txn, params, a.sk).blob;
    const full = algosdk.appendSignMultisigTransaction(half, params, b.sk).blob;
    expect(
      isArc14TokenUsable(arc14TokenFromSigned(half), msig, BIATEC_ROUTER_REALM, 1500n),
    ).toBe(false);
    expect(
      isArc14TokenUsable(arc14TokenFromSigned(full), msig, BIATEC_ROUTER_REALM, 1500n),
    ).toBe(true);
  });

  test("the token is `SigTx <base64>` and round-trips", () => {
    const signed = login(addr).signTxn(acct.sk);
    const t = arc14TokenFromSigned(signed);
    expect(t.startsWith("SigTx ")).toBe(true);
    expect(parseArc14Token(t)?.txn.sender.toString()).toBe(addr);
  });
});

test.describe("resolveArc14AuthRoute", () => {
  test("multisig / 2FA and Ledger sign the login once on the Sign-all page", () => {
    expect(resolveArc14AuthRoute("msig")).toBe("signAll");
    expect(resolveArc14AuthRoute("ledger")).toBe("signAll");
  });
  test("accounts with a key in the wallet sign it in place", () => {
    for (const type of ["sk", "hd", "falcon1024"] as const) {
      expect(resolveArc14AuthRoute(type)).toBe("direct");
    }
  });
  test("an account the wallet cannot sign for has no login", () => {
    expect(resolveArc14AuthRoute("?")).toBe("none");
  });
  test("the ARC14 page has its own return label", () => {
    expect(signAllReturnLabelKey("Arc14")).toBe("return_to_arc14");
  });
});
