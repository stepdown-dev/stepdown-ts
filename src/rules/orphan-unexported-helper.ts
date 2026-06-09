import type { FunctionOrder, ScopeFunction } from "../call-graph.js";
import type { Diagnostic } from "../diagnostic.js";
import { sourcePosition } from "../source-position.js";

export const RULE_NAME = "orphan-unexported-helper";

const DESCRIPTION = "unexported helpers must be reached from a public root in the same scope";

export function orphanUnexportedHelperDiagnostics(order: FunctionOrder): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const item of order.actual) {
    if (item.role === "helper" && !order.ownerByHelperIdentity.has(item.identity)) {
      diagnostics.push(orphanUnexportedHelperDiagnostic(item));
    }
  }
  return diagnostics;
}

function orphanUnexportedHelperDiagnostic(item: ScopeFunction): Diagnostic {
  const position = sourcePosition(item.sourceFile, item.node);
  return {
    ...position,
    rule: RULE_NAME,
    description: DESCRIPTION,
  };
}
