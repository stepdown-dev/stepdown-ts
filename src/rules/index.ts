export type RuleName =
  | "section-order"
  | "dfs-public-root"
  | "helper-placement"
  | "orphan-unexported-helper"
  | "accessor-pair"
  | "class-member-order"
  | "declaration-zone-order";

export const RULE_NAMES: readonly RuleName[] = [
  "section-order",
  "dfs-public-root",
  "helper-placement",
  "orphan-unexported-helper",
  "accessor-pair",
  "class-member-order",
  "declaration-zone-order",
] as const;
