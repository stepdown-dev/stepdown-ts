import type { FunctionOrder, ScopeFunction } from "../call-graph.js";
import type { Diagnostic } from "../diagnostic.js";
import { sourcePosition } from "../source-position.js";

export const RULE_NAME = "helper-placement";

const DESCRIPTION = "helpers must follow the depth-first order of the first public root that reaches them";

export function helperPlacementDiagnostics(order: FunctionOrder): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const actualIndex = functionIndexes(order.actual);
  const expectedIndex = functionIndexes(order.expected);
  for (const item of order.actual) {
    if (!misplacedHelper(item, order, actualIndex, expectedIndex)) {
      continue;
    }
    diagnostics.push(helperPlacementDiagnostic(item));
  }
  return diagnostics;
}

function functionIndexes(functions: readonly ScopeFunction[]): Map<string, number> {
  const indexes = new Map<string, number>();
  functions.forEach((item, index) => indexes.set(item.identity, index));
  return indexes;
}

function misplacedHelper(
  item: ScopeFunction,
  order: FunctionOrder,
  actualIndex: ReadonlyMap<string, number>,
  expectedIndex: ReadonlyMap<string, number>,
): boolean {
  if (item.role !== "helper" || !order.ownerByHelperIdentity.has(item.identity)) {
    return false;
  }
  const owner = order.ownerByHelperIdentity.get(item.identity);
  const ownerIndex = owner === undefined ? undefined : actualIndex.get(owner);
  const helperIndex = actualIndex.get(item.identity);
  if (ownerIndex === undefined || helperIndex === undefined || helperIndex < ownerIndex) {
    return false;
  }
  return expectedIndex.get(item.identity) !== helperIndex;
}

function helperPlacementDiagnostic(item: ScopeFunction): Diagnostic {
  const position = sourcePosition(item.sourceFile, item.node);
  return {
    ...position,
    rule: RULE_NAME,
    description: DESCRIPTION,
  };
}
