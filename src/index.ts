// stepdown-ts — programmatic entry point.
// Rule implementation gated on ADR-0001 ratification.

export type { Diagnostic } from "./diagnostic.js";
export { runStepdown } from "./walker.js";
export { RULE_NAMES, type RuleName } from "./rules/index.js";
