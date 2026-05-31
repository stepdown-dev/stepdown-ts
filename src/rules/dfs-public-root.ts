// Rule: dfs-public-root
// Within a scope (module or single class body), a public entry point is
// immediately followed by its private callees in depth-first pre-order.
// DFS is AST-local and bounded — direct, statically-resolvable call edges only.
// Per ADR-0001 (forthcoming).

export const RULE_NAME = "dfs-public-root";

// TODO: implement once ADR-0001 + Principles doc land.
