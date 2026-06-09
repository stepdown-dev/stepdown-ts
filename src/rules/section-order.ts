import type { Diagnostic } from "../diagnostic.js";
import type { ModuleDeclaration, ModuleSection } from "../declaration.js";
import { sourcePosition } from "../source-position.js";

export const RULE_NAME = "section-order";

const SECTION_RANK: Record<ModuleSection, number> = {
  import: 0,
  declaration: 1,
  behavior: 2,
};

const DESCRIPTION = "module sections must appear as imports, declaration zone, then behavior zone";

export function sectionOrderDiagnostics(declarations: readonly ModuleDeclaration[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let acceptedRank = SECTION_RANK.import;
  for (const declaration of declarations) {
    const rank = SECTION_RANK[declaration.section];
    if (rank < acceptedRank) {
      diagnostics.push(sectionOrderDiagnostic(declaration));
    }
    if (rank > acceptedRank) {
      acceptedRank = rank;
    }
  }
  return diagnostics;
}

function sectionOrderDiagnostic(declaration: ModuleDeclaration): Diagnostic {
  const position = sourcePosition(declaration.sourceFile, declaration.node);
  return {
    ...position,
    rule: RULE_NAME,
    description: DESCRIPTION,
  };
}
