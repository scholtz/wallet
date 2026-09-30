// Pure signing-risk evaluation over decoded ARC-56 app calls. Deliberately
// type-only imports so it stays loadable from the Node-only unit tests.
import type { Arc56Owner } from "./types";
import type { Arc56TrustLevel } from "./decode";

export interface Arc56RiskInput {
  trust: Arc56TrustLevel;
  // null = not looked up (no approval hash); [] = looked up, no publisher.
  owners: Arc56Owner[] | null;
  // App creation, UpdateApplication or DeleteApplication: never presented as
  // reassuring, whatever the registry says about the (new or old) program.
  sensitive?: boolean;
  // The registry/algod lookup for this call did not complete (failure or
  // deadline) - reported as such rather than as "not registered".
  lookupFailed?: boolean;
}

export interface Arc56RiskOptions {
  // Any transaction in the request closes out an account/asset holding or
  // rekeys the sender. A verdict scoped to the app calls must not read as
  // "safe to sign" while such a transaction sits next to them.
  riskyFields?: boolean;
}

// "none": nothing to show (no app calls, no risky fields). "not-abi": every app call is
// non-ABI, so the registry cannot say anything about it.
export type Arc56RiskLevel = "none" | "not-abi" | "trusted" | "warning" | "danger";

export type Arc56RiskReason =
  | "banned_publisher"
  | "method_mismatch"
  | "unregistered"
  | "lookup_failed"
  | "no_publisher"
  | "low_reputation_publisher"
  | "unrated_publisher"
  | "not_abi"
  | "sensitive_call"
  | "risky_fields";

export interface Arc56RiskResult {
  level: Arc56RiskLevel;
  reasons: Arc56RiskReason[];
}

type PublisherStanding = "banned" | "trusted" | "low_reputation" | "unrated" | "none";

// A contract can legitimately be vendored/forked across repos with the same
// program hash, so the best-rated publisher decides - except that any banned
// publisher always wins, since a confirmed bad actor is the one signal the
// registry treats as certain.
export const publisherStanding = (owners: Arc56Owner[] | null): PublisherStanding => {
  if (!owners || owners.length === 0) return "none";
  if (owners.some((o) => o.banned === true || o.riskLevel === "banned")) return "banned";
  if (owners.some((o) => o.riskLevel === "low")) return "trusted";
  if (owners.some((o) => o.riskLevel === "medium" || o.riskLevel === "high" || o.riskLevel === "very_high")) {
    return "low_reputation";
  }
  return "unrated";
};

const RANK: Record<Arc56RiskLevel, number> = {
  none: 0,
  "not-abi": 1,
  trusted: 2,
  warning: 3,
  danger: 4,
};

const evaluateBase = (input: Arc56RiskInput): Arc56RiskResult => {
  if (input.lookupFailed) return { level: "warning", reasons: ["lookup_failed"] };
  // A confirmed bad actor is danger whichever decode branch was taken.
  if (publisherStanding(input.owners) === "banned") {
    return {
      level: "danger",
      reasons: input.trust === "not-abi" ? ["banned_publisher", "not_abi"] : ["banned_publisher"],
    };
  }
  switch (input.trust) {
    case "not-abi":
      // No approval program could be looked up: the publisher/ban check did
      // not run, so fail closed like the ABI path does.
      if (input.owners === null) return { level: "warning", reasons: ["lookup_failed"] };
      return { level: "not-abi", reasons: ["not_abi"] };
    case "verified-other-method":
      return { level: "danger", reasons: ["method_mismatch"] };
    case "selector-only":
    case "unknown":
      return { level: "warning", reasons: ["unregistered"] };
    case "verified": {
      switch (publisherStanding(input.owners)) {
        case "banned": // handled above; kept so the switch stays exhaustive
          return { level: "danger", reasons: ["banned_publisher"] };
        case "trusted":
          return { level: "trusted", reasons: [] };
        case "low_reputation":
          return { level: "warning", reasons: ["low_reputation_publisher"] };
        case "unrated":
          return { level: "warning", reasons: ["unrated_publisher"] };
        case "none":
          return { level: "warning", reasons: ["no_publisher"] };
      }
    }
  }
};

const evaluateOne = (input: Arc56RiskInput): Arc56RiskResult => {
  const base = evaluateBase(input);
  if (!input.sensitive) return base;
  const level = RANK[base.level] < RANK.warning ? "warning" : base.level;
  return { level, reasons: [...base.reasons, "sensitive_call"] };
};

// Worst app call decides. "trusted" is only shown when every app call is
// trusted: a group mixing trusted calls with unverifiable non-ABI ones
// escalates to "warning" rather than showing a reassuring badge that the
// non-ABI call has not earned.
export const evaluateArc56Risk = (
  inputs: Arc56RiskInput[],
  options: Arc56RiskOptions = {},
): Arc56RiskResult => {
  if (inputs.length === 0) {
    // No app calls, but a close-out/rekey is still worth a caution icon.
    return options.riskyFields
      ? { level: "warning", reasons: ["risky_fields"] }
      : { level: "none", reasons: [] };
  }
  const results = inputs.map(evaluateOne);
  let level = results.reduce<Arc56RiskLevel>(
    (worst, r) => (RANK[r.level] > RANK[worst] ? r.level : worst),
    "none",
  );
  const reasons = [...new Set(results.flatMap((r) => r.reasons))];
  const hasNotAbi = results.some((r) => r.level === "not-abi");
  const hasTrusted = results.some((r) => r.level === "trusted");
  if (hasNotAbi && hasTrusted && level === "trusted") level = "warning";
  if (options.riskyFields) {
    if (RANK[level] < RANK.warning) level = "warning";
    reasons.push("risky_fields");
  }
  return { level, reasons };
};
