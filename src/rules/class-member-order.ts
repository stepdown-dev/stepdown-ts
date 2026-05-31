// Rule: class-member-order
// Class body order: fields → constructor → public methods (DFS to private) →
// private methods → statics (one block, last, no further classification within).
// No factory detection. Per ADR-0001 (forthcoming).

export const RULE_NAME = "class-member-order";

// TODO: implement once ADR-0001 + Principles doc land.
