import { test, expect } from "@playwright/test";
import {
  groupFeeShortfall,
  lowFalconGroupFee,
  FALCON1024_EXTRA_USAGE,
  MAX_AUTO_FEE_MICROALGOS,
  USAGE_PER_MIN_FEE,
  minimumUsageForSigner,
  requiredFeeFromUsage,
  resolveRequiredFee,
  uriFeeToAlgo,
} from "../../src/scripts/fees";

const MIN_FEE = 1000n;

test.describe("requiredFeeFromUsage", () => {
  test("one min fee for baseline usage", () => {
    expect(requiredFeeFromUsage(MIN_FEE, USAGE_PER_MIN_FEE)).toBe(1000n);
  });

  test("three min fees for falcon usage", () => {
    expect(
      requiredFeeFromUsage(MIN_FEE, USAGE_PER_MIN_FEE + FALCON1024_EXTRA_USAGE),
    ).toBe(3000n);
  });

  test("rounds up to a whole microalgo", () => {
    expect(requiredFeeFromUsage(MIN_FEE, 1_000_001n)).toBe(1001n);
    expect(requiredFeeFromUsage(MIN_FEE, 1_999_999n)).toBe(2000n);
  });
});

test.describe("minimumUsageForSigner", () => {
  test("ed25519 pays base usage", () => {
    expect(minimumUsageForSigner(false)).toBe(1_000_000n);
  });

  test("falcon pays base plus signature surcharge", () => {
    expect(minimumUsageForSigner(true)).toBe(3_000_000n);
  });
});

test.describe("resolveRequiredFee", () => {
  test("uses simulated usage when above the floor", () => {
    expect(
      resolveRequiredFee({
        minFee: MIN_FEE,
        groupUsage: 4_000_000n,
        falcon1024Signer: true,
      }),
    ).toBe(4000n);
  });

  test("falcon floor wins when simulate cannot see the pq signature", () => {
    // simulate with allowEmptySignatures reports plain-signature usage
    expect(
      resolveRequiredFee({
        minFee: MIN_FEE,
        groupUsage: 1_000_000n,
        falcon1024Signer: true,
      }),
    ).toBe(3000n);
  });

  test("falls back to the floor when simulate reported no usage", () => {
    expect(
      resolveRequiredFee({
        minFee: MIN_FEE,
        groupUsage: undefined,
        falcon1024Signer: false,
      }),
    ).toBe(1000n);
    expect(
      resolveRequiredFee({
        minFee: MIN_FEE,
        groupUsage: 0n,
        falcon1024Signer: true,
      }),
    ).toBe(3000n);
  });

  test("typical fees stay far below the auto-adjust cap", () => {
    expect(
      resolveRequiredFee({
        minFee: MIN_FEE,
        groupUsage: 3_000_000n,
        falcon1024Signer: true,
      }),
    ).toBeLessThan(MAX_AUTO_FEE_MICROALGOS);
  });
});

test.describe("groupFeeShortfall (Falcon fee warning in the Direct popup)", () => {
  test("a Falcon transaction paying one min fee is short by two", () => {
    expect(groupFeeShortfall([{ fee: 1000n, falcon1024: true }])).toBe(2000n);
  });

  test("a Falcon transaction paying three min fees is not short", () => {
    expect(groupFeeShortfall([{ fee: 3000n, falcon1024: true }])).toBe(0n);
  });

  test("an ordinary transaction paying one min fee is not short", () => {
    expect(groupFeeShortfall([{ fee: 1000n, falcon1024: false }])).toBe(0n);
  });

  test("fee pooling: another transaction of the group can cover the Falcon one", () => {
    expect(
      groupFeeShortfall([
        { fee: 0n, falcon1024: true },
        { fee: 4000n, falcon1024: false },
      ]),
    ).toBe(0n);
  });

  test("no transactions, no shortfall", () => {
    expect(groupFeeShortfall([])).toBe(0n);
  });

  test("a different network minimum fee scales the requirement", () => {
    expect(groupFeeShortfall([{ fee: 3000n, falcon1024: true }], 2000n)).toBe(3000n);
  });
});

test.describe("lowFalconGroupFee (SignAll / Direct Falcon fee warning)", () => {
  const group = new Uint8Array([1, 2, 3]);

  test("a lone Falcon transaction paying one min fee is flagged with its fee", () => {
    expect(lowFalconGroupFee([{ fee: 1000n, falcon1024: true }])).toBe(1000);
  });

  test("a Falcon transaction paying three min fees is fine", () => {
    expect(lowFalconGroupFee([{ fee: 3000n, falcon1024: true }])).toBeUndefined();
  });

  test("ordinary signers are never flagged", () => {
    expect(lowFalconGroupFee([{ fee: 0n, falcon1024: false }])).toBeUndefined();
  });

  test("fees pool inside an atomic group", () => {
    expect(
      lowFalconGroupFee([
        { fee: 0n, falcon1024: true, group },
        { fee: 4000n, falcon1024: false, group },
      ]),
    ).toBeUndefined();
  });

  test("ungrouped transactions do not pool", () => {
    expect(
      lowFalconGroupFee([
        { fee: 0n, falcon1024: true },
        { fee: 4000n, falcon1024: false },
      ]),
    ).toBe(0);
  });

  test("a short group reports the group's total declared fee", () => {
    expect(
      lowFalconGroupFee([
        { fee: 1000n, falcon1024: true, group },
        { fee: 1000n, falcon1024: false, group },
      ]),
    ).toBe(2000);
  });

  test("no transactions, no warning", () => {
    expect(lowFalconGroupFee([])).toBeUndefined();
  });
});

// AW-2026-083: the fee of a payment link is microalgos and capped.
test.describe("uriFeeToAlgo", () => {
  test("reads the parameter as microalgos", () => {
    expect(uriFeeToAlgo("1000")).toBe(0.001);
    expect(uriFeeToAlgo(2000)).toBe(0.002);
    expect(uriFeeToAlgo("1000")).toBe(0.001);
  });

  test("a gateway link round-trips: 0.001 ALGO is written as 1000 and read back as 0.001", () => {
    expect(uriFeeToAlgo(String(Math.round(0.001 * 1_000_000)))).toBe(0.001);
  });

  test("drops fees below the network minimum", () => {
    expect(uriFeeToAlgo("0")).toBeUndefined();
    expect(uriFeeToAlgo("999")).toBeUndefined();
  });

  test("drops fees above the automatic ceiling instead of pre-filling them", () => {
    expect(uriFeeToAlgo("100000")).toBe(0.1);
    expect(uriFeeToAlgo("100001")).toBeUndefined();
    expect(uriFeeToAlgo("2000000000")).toBeUndefined();
  });

  test("drops values that are not whole non-negative numbers", () => {
    for (const bad of ["", "-1", "1.5", "1e3", "abc", "0x10", " ", "99999999999999999999"]) {
      expect(uriFeeToAlgo(bad)).toBeUndefined();
    }
    expect(uriFeeToAlgo(undefined)).toBeUndefined();
  });
});
