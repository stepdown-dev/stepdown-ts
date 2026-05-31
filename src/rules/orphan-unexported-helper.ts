// Rule: orphan-unexported-helper
// Unexported helpers with no public caller are flagged. Either they belong to
// a public root (place them under it) or they are unreachable (remove them).
// Per ADR-0001 (forthcoming).

export const RULE_NAME = "orphan-unexported-helper";

// TODO: implement once ADR-0001 + Principles doc land.
