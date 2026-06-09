import type { FunctionOrder, ScopeFunction } from "../call-graph.js";
import type { Diagnostic } from "../diagnostic.js";
import { sourcePosition } from "../source-position.js";

export const RULE_NAME = "dfs-public-root";

const DESCRIPTION = "helpers must appear after the public root that first reaches them";

export function dfsPublicRootDiagnostics(order: FunctionOrder): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const actualIndex = functionIndexes(order.actual);
  for (const item of order.actual) {
    if (item.role !== "helper") {
      continue;
    }
    const owner = order.ownerByHelperIdentity.get(item.identity);
    if (owner === undefined) {
      continue;
    }
    const ownerIndex = actualIndex.get(owner);
    const helperIndex = actualIndex.get(item.identity);
    if (ownerIndex !== undefined && helperIndex !== undefined && helperIndex < ownerIndex) {
      diagnostics.push(dfsPublicRootDiagnostic(item));
    }
  }
  return diagnostics;
}

function functionIndexes(functions: readonly ScopeFunction[]): Map<string, number> {
  const indexes = new Map<string, number>();
  functions.forEach((item, index) => indexes.set(item.identity, index));
  return indexes;
}

function dfsPublicRootDiagnostic(item: ScopeFunction): Diagnostic {
  const position = sourcePosition(item.sourceFile, item.node);
  return {
    ...position,
    rule: RULE_NAME,
    description: DESCRIPTION,
  };
}
