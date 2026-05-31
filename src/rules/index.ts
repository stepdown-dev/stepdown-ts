// Rule registry — one module per rule per ADR-0001 (forthcoming).
// Implementation gated on ADR ratification.

export const RULE_NAMES = [
  "section-order",
  "dfs-public-root",
  "helper-placement",
  "orphan-unexported-helper",
  "accessor-pair",
  "class-member-order",
  "declaration-zone-order",
] as const;

export type RuleName = (typeof RULE_NAMES)[number];
