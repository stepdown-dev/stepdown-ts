import type { Diagnostic } from "../diagnostic.js";
import type { ModuleDeclaration } from "../declaration.js";
import { sourcePosition } from "../source-position.js";

export const RULE_NAME = "declaration-zone-order";

const DESCRIPTION = "declaration zone must place types, interfaces, and enums before value declarations";

export function declarationZoneOrderDiagnostics(declarations: readonly ModuleDeclaration[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let sawValue = false;
  for (const declaration of declarations) {
    if (declaration.section !== "declaration") {
      continue;
    }
    if (declaration.kind === "value") {
      sawValue = true;
    }
    if (declaration.kind === "type" && sawValue) {
      diagnostics.push(declarationZoneOrderDiagnostic(declaration));
    }
  }
  return diagnostics;
}

function declarationZoneOrderDiagnostic(declaration: ModuleDeclaration): Diagnostic {
  const position = sourcePosition(declaration.sourceFile, declaration.node);
  return {
    ...position,
    rule: RULE_NAME,
    description: DESCRIPTION,
  };
}
