import { test, expect } from "@playwright/test";
import { evaluateArc56Risk, publisherStanding } from "../../src/scripts/arc56/risk";
import type { Arc56Owner } from "../../src/scripts/arc56/types";

const owner = (extra: Partial<Arc56Owner>): Arc56Owner => ({
  owner: "a",
  repo: "b",
  url: "https://github.com/a/b",
  ...extra,
});

test.describe("evaluateArc56Risk", () => {
  test("no app calls -> none", () => {
    expect(evaluateArc56Risk([]).level).toBe("none");
  });

  test("all non-ABI -> not-abi", () => {
    expect(
      evaluateArc56Risk([
        { trust: "not-abi", owners: null },
        { trust: "not-abi", owners: null },
      ]).level,
    ).toBe("not-abi");
  });

  test("verified + low-risk publisher -> trusted; medium is not", () => {
    expect(
      evaluateArc56Risk([{ trust: "verified", owners: [owner({ riskLevel: "low" })] }]).level,
    ).toBe("trusted");
    expect(
      evaluateArc56Risk([{ trust: "verified", owners: [owner({ riskLevel: "medium" })] }]).level,
    ).toBe("warning");
  });

  test("verified but high-risk, unrated or missing publisher -> warning", () => {
    expect(
      evaluateArc56Risk([{ trust: "verified", owners: [owner({ riskLevel: "high" })] }]),
    ).toEqual({ level: "warning", reasons: ["low_reputation_publisher"] });
    expect(evaluateArc56Risk([{ trust: "verified", owners: [owner({})] }]).reasons).toEqual([
      "unrated_publisher",
    ]);
    expect(evaluateArc56Risk([{ trust: "verified", owners: [] }]).reasons).toEqual([
      "no_publisher",
    ]);
  });

  test("banned publisher wins over a good one", () => {
    const owners = [owner({ riskLevel: "low" }), owner({ banned: true, riskLevel: "banned" })];
    expect(publisherStanding(owners)).toBe("banned");
    expect(evaluateArc56Risk([{ trust: "verified", owners }]).level).toBe("danger");
  });

  test("unregistered program -> warning; other method -> danger", () => {
    expect(evaluateArc56Risk([{ trust: "unknown", owners: null }]).level).toBe("warning");
    expect(evaluateArc56Risk([{ trust: "selector-only", owners: null }]).level).toBe("warning");
    expect(evaluateArc56Risk([{ trust: "verified-other-method", owners: [] }]).level).toBe(
      "danger",
    );
  });

  test("worst call decides; trusted mixed with non-ABI is not trusted", () => {
    const good = { trust: "verified" as const, owners: [owner({ riskLevel: "low" })] };
    expect(evaluateArc56Risk([good, { trust: "unknown", owners: null }]).level).toBe("warning");
    expect(
      evaluateArc56Risk([good, { trust: "verified-other-method", owners: [] }]).level,
    ).toBe("danger");
    expect(evaluateArc56Risk([good, { trust: "not-abi", owners: null }])).toEqual({
      level: "warning",
      reasons: ["not_abi"],
    });
  });

  test("sensitive calls (create/update/delete) are never trusted", () => {
    const good = { trust: "verified" as const, owners: [owner({ riskLevel: "low" })] };
    expect(evaluateArc56Risk([{ ...good, sensitive: true }])).toEqual({
      level: "warning",
      reasons: ["sensitive_call"],
    });
    expect(evaluateArc56Risk([{ trust: "not-abi", owners: null, sensitive: true }]).level).toBe(
      "warning",
    );
    expect(
      evaluateArc56Risk([{ trust: "verified-other-method", owners: [], sensitive: true }]).level,
    ).toBe("danger");
  });

  test("close-out/rekey elsewhere in the request downgrades a trusted verdict", () => {
    const good = { trust: "verified" as const, owners: [owner({ riskLevel: "low" })] };
    expect(evaluateArc56Risk([good], { riskyFields: true })).toEqual({
      level: "warning",
      reasons: ["risky_fields"],
    });
    expect(evaluateArc56Risk([{ trust: "not-abi", owners: null }], { riskyFields: true }).level).toBe(
      "warning",
    );
    expect(evaluateArc56Risk([], { riskyFields: true })).toEqual({
      level: "warning",
      reasons: ["risky_fields"],
    });
  });

  test("non-ABI call to a banned publisher's program is danger, not just unverifiable", () => {
    expect(
      evaluateArc56Risk([
        { trust: "not-abi", owners: [owner({ banned: true, riskLevel: "banned" })] },
      ]).level,
    ).toBe("danger");
  });
});
