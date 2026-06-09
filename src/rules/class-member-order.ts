import type { ClassMember, ClassRecord, MemberSection } from "../class-member.js";
import type { Diagnostic } from "../diagnostic.js";
import { sourcePosition } from "../source-position.js";

export const RULE_NAME = "class-member-order";

const SECTION_RANK: Record<MemberSection, number> = {
  field: 0,
  constructor: 1,
  public: 2,
  private: 2,
  static: 3,
};

const DESCRIPTION = "class members must appear as fields, constructor, behavior, then static members";

export function classMemberOrderDiagnostics(records: readonly ClassRecord[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const record of records) {
    diagnostics.push(...classMemberOrderDiagnosticsForClass(record));
  }
  return diagnostics;
}

function classMemberOrderDiagnosticsForClass(record: ClassRecord): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let acceptedRank = SECTION_RANK.field;
  for (const member of record.members) {
    const rank = SECTION_RANK[member.section];
    if (rank < acceptedRank) {
      diagnostics.push(classMemberOrderDiagnostic(member));
    }
    if (rank > acceptedRank) {
      acceptedRank = rank;
    }
  }
  return diagnostics;
}

function classMemberOrderDiagnostic(member: ClassMember): Diagnostic {
  const position = sourcePosition(member.sourceFile, member.node);
  return {
    ...position,
    rule: RULE_NAME,
    description: DESCRIPTION,
  };
}
