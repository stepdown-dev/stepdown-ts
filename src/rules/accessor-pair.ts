import type { ClassMember, ClassRecord } from "../class-member.js";
import type { Diagnostic } from "../diagnostic.js";
import { sourcePosition } from "../source-position.js";

interface IndexedMember {
  readonly member: ClassMember;
  readonly index: number;
}

export const RULE_NAME = "accessor-pair";

const DESCRIPTION = "paired get and set accessors for the same property must stay adjacent";

export function accessorPairDiagnostics(records: readonly ClassRecord[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const record of records) {
    diagnostics.push(...accessorPairDiagnosticsForClass(record));
  }
  return diagnostics;
}

function accessorPairDiagnosticsForClass(record: ClassRecord): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const accessors = accessorsByName(record.members);
  for (const paired of accessors.values()) {
    const diagnostic = accessorPairDiagnostic(paired);
    if (diagnostic !== null) {
      diagnostics.push(diagnostic);
    }
  }
  return diagnostics;
}

function accessorsByName(members: readonly ClassMember[]): Map<string, IndexedMember[]> {
  const accessors = new Map<string, IndexedMember[]>();
  for (let index = 0; index < members.length; index += 1) {
    const member = members[index];
    if (member === undefined) {
      continue;
    }
    if (member.accessor === "none" || member.name === "") {
      continue;
    }
    const paired = accessors.get(accessorKey(member)) ?? [];
    paired.push({ member, index });
    accessors.set(accessorKey(member), paired);
  }
  return accessors;
}

function accessorKey(member: ClassMember): string {
  return `${member.section}:${member.name}`;
}

function accessorPairDiagnostic(members: readonly IndexedMember[]): Diagnostic | null {
  if (!hasAccessorPair(members) || adjacentMembers(members)) {
    return null;
  }
  const member = lastMember(members);
  return member === null ? null : diagnosticAt(member);
}

function hasAccessorPair(members: readonly IndexedMember[]): boolean {
  return (
    members.some((item) => item.member.accessor === "get") &&
    members.some((item) => item.member.accessor === "set")
  );
}

function adjacentMembers(members: readonly IndexedMember[]): boolean {
  const indexes = members.map((item) => item.index).sort((left, right) => left - right);
  const first = indexes[0];
  const second = indexes[1];
  return first !== undefined && second !== undefined && indexes.length === 2 && second === first + 1;
}

function lastMember(members: readonly IndexedMember[]): ClassMember | null {
  const item = members[members.length - 1];
  return item?.member ?? null;
}

function diagnosticAt(member: ClassMember): Diagnostic {
  const position = sourcePosition(member.sourceFile, member.node);
  return {
    ...position,
    rule: RULE_NAME,
    description: DESCRIPTION,
  };
}
