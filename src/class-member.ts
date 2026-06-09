import ts from "typescript";

import { nameText } from "./declaration.js";

export type MemberSection = "field" | "constructor" | "public" | "private" | "static";
export type AccessorKind = "get" | "set" | "none";

export interface ClassRecord {
  readonly sourceFile: ts.SourceFile;
  readonly name: string;
  readonly members: readonly ClassMember[];
}

export interface ClassMember {
  readonly sourceFile: ts.SourceFile;
  readonly className: string;
  readonly node: ts.ClassElement;
  readonly name: string;
  readonly section: MemberSection;
  readonly accessor: AccessorKind;
  readonly body: ts.Node | null;
}

export function classRecords(sourceFile: ts.SourceFile): ClassRecord[] {
  const records: ClassRecord[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement)) {
      records.push(classRecord(sourceFile, statement));
    }
  }
  return records;
}

function classRecord(sourceFile: ts.SourceFile, declaration: ts.ClassDeclaration): ClassRecord {
  const className = nameText(declaration.name);
  const members: ClassMember[] = [];
  for (const member of declaration.members) {
    members.push(classMember(sourceFile, className, member));
  }
  return {
    sourceFile,
    name: className,
    members,
  };
}

function classMember(sourceFile: ts.SourceFile, className: string, member: ts.ClassElement): ClassMember {
  const name = memberName(member);
  const section = memberSection(member);
  const accessor = accessorKind(member);
  const body = memberBody(member);
  return {
    sourceFile,
    className,
    node: member,
    name,
    section,
    accessor,
    body,
  };
}

function memberName(member: ts.ClassElement): string {
  if (ts.isConstructorDeclaration(member)) {
    return "constructor";
  }
  if ("name" in member) {
    return nameText(member.name);
  }
  return "";
}

function memberSection(member: ts.ClassElement): MemberSection {
  if (isStatic(member)) {
    return "static";
  }
  if (ts.isConstructorDeclaration(member)) {
    return "constructor";
  }
  if (isCallable(member)) {
    return isPrivateMember(member) ? "private" : "public";
  }
  return "field";
}

function isStatic(member: ts.ClassElement): boolean {
  return modifiersOf(member).some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword);
}

function modifiersOf(node: ts.Node): readonly ts.ModifierLike[] {
  if (!ts.canHaveModifiers(node)) {
    return [];
  }
  return ts.getModifiers(node) ?? [];
}

function isCallable(
  member: ts.ClassElement,
): member is ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration {
  return ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member);
}

function isPrivateMember(member: ts.ClassElement): boolean {
  return (
    privateName(member) ||
    modifiersOf(member).some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)
  );
}

function privateName(member: ts.ClassElement): boolean {
  return "name" in member && member.name !== undefined && ts.isPrivateIdentifier(member.name);
}

function accessorKind(member: ts.ClassElement): AccessorKind {
  if (ts.isGetAccessorDeclaration(member)) {
    return "get";
  }
  if (ts.isSetAccessorDeclaration(member)) {
    return "set";
  }
  return "none";
}

function memberBody(member: ts.ClassElement): ts.Node | null {
  if (isCallable(member)) {
    return member.body ?? null;
  }
  return null;
}
