import ts from "typescript";

import type { ClassRecord } from "./class-member.js";
import type { ModuleDeclaration } from "./declaration.js";
import { nameText } from "./declaration.js";

export type FunctionRole = "root" | "helper";

export interface ScopeFunction {
  readonly sourceFile: ts.SourceFile;
  readonly node: ts.Node;
  readonly identity: string;
  readonly name: string;
  readonly role: FunctionRole;
  readonly body: ts.Node | null;
}

export interface FunctionOrder {
  readonly actual: readonly ScopeFunction[];
  readonly expected: readonly ScopeFunction[];
  readonly ownerByHelperIdentity: ReadonlyMap<string, string>;
}

export function moduleFunctions(declarations: readonly ModuleDeclaration[]): ScopeFunction[] {
  const functions: ScopeFunction[] = [];
  for (const declaration of declarations) {
    if (!isNamedOrRootDeclaration(declaration)) {
      continue;
    }
    functions.push(moduleScopeFunction(declaration));
  }
  return functions;
}

function isNamedOrRootDeclaration(
  declaration: ModuleDeclaration,
): declaration is ModuleDeclaration & { readonly kind: FunctionRole } {
  return isScopeDeclaration(declaration) && (declaration.kind === "root" || declaration.name !== "");
}

function isScopeDeclaration(
  declaration: ModuleDeclaration,
): declaration is ModuleDeclaration & { readonly kind: FunctionRole } {
  return declaration.kind === "root" || declaration.kind === "helper";
}

function moduleScopeFunction(declaration: ModuleDeclaration & { readonly kind: FunctionRole }): ScopeFunction {
  return {
    sourceFile: declaration.sourceFile,
    node: declaration.node,
    identity: functionIdentity(declaration.sourceFile, declaration.node),
    name: declaration.name,
    role: declaration.kind,
    body: moduleBody(declaration.node),
  };
}

function functionIdentity(sourceFile: ts.SourceFile, node: ts.Node): string {
  return `${sourceFile.fileName}:${node.pos}`;
}

function moduleBody(node: ts.Node): ts.Node | null {
  if (ts.isFunctionDeclaration(node)) {
    return node.body ?? null;
  }
  if (ts.isVariableDeclaration(node)) {
    return functionLiteralBody(node.initializer);
  }
  return null;
}

function functionLiteralBody(node: ts.Expression | undefined): ts.Node | null {
  if (node === undefined) {
    return null;
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return node.body;
  }
  return null;
}

export function classFunctions(record: ClassRecord): ScopeFunction[] {
  const functions: ScopeFunction[] = [];
  for (const member of record.members) {
    if (!isClassFunction(member) || member.name === "") {
      continue;
    }
    functions.push(classScopeFunction(member));
  }
  return functions;
}

function isClassFunction(member: ClassRecord["members"][number]): boolean {
  return member.section === "public" || member.section === "private";
}

function classScopeFunction(member: ClassRecord["members"][number]): ScopeFunction {
  return {
    sourceFile: member.sourceFile,
    node: member.node,
    identity: functionIdentity(member.sourceFile, member.node),
    name: member.name,
    role: member.section === "public" ? "root" : "helper",
    body: member.body,
  };
}

export function moduleFunctionOrder(functions: readonly ScopeFunction[]): FunctionOrder {
  const byName = functionsByCallableName(functions);
  const owned = new Map<string, string>();
  const expected: ScopeFunction[] = [];
  for (const item of functions) {
    if (item.role !== "root") {
      continue;
    }
    expected.push(item);
    for (const childName of moduleCalls(item, byName)) {
      appendModuleOwned(expected, owned, item.identity, childName, byName);
    }
  }
  return { actual: functions, expected, ownerByHelperIdentity: owned };
}

function functionsByCallableName(functions: readonly ScopeFunction[]): Map<string, ScopeFunction[]> {
  const byName = new Map<string, ScopeFunction[]>();
  for (const item of functions) {
    if (item.name === "") {
      continue;
    }
    const group = byName.get(item.name) ?? [];
    group.push(item);
    byName.set(item.name, group);
  }
  return byName;
}

function moduleCalls(item: ScopeFunction, functionsByName: ReadonlyMap<string, readonly ScopeFunction[]>): string[] {
  return directModuleCalls(item, functionsByName);
}

function directModuleCalls(
  item: ScopeFunction,
  functionsByName: ReadonlyMap<string, readonly ScopeFunction[]>,
): string[] {
  if (item.body === null) {
    return [];
  }
  const calls: string[] = [];
  collectModuleCalls(item.body, item.body, functionsByName, calls);
  return calls;
}

function collectModuleCalls(
  root: ts.Node,
  node: ts.Node,
  functionsByName: ReadonlyMap<string, readonly ScopeFunction[]>,
  calls: string[],
): void {
  if (node !== root && isNestedScope(node)) {
    return;
  }
  if (ts.isCallExpression(node)) {
    const name = moduleCallName(node);
    if (functionsByName.has(name)) {
      calls.push(name);
    }
  }
  if (ts.isNewExpression(node)) {
    const name = moduleNewName(node);
    if (functionsByName.has(name)) {
      calls.push(name);
    }
  }
  ts.forEachChild(node, (child) => collectModuleCalls(root, child, functionsByName, calls));
}

function isNestedScope(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node)
  );
}

function moduleCallName(call: ts.CallExpression): string {
  return ts.isIdentifier(call.expression) ? call.expression.text : "";
}

function moduleNewName(expression: ts.NewExpression): string {
  return ts.isIdentifier(expression.expression) ? expression.expression.text : "";
}

function appendModuleOwned(
  expected: ScopeFunction[],
  owned: Map<string, string>,
  owner: string,
  name: string,
  byName: ReadonlyMap<string, readonly ScopeFunction[]>,
): void {
  const group = byName.get(name) ?? [];
  if (ownedGroup(group, owned)) {
    return;
  }
  const helpers = helperGroup(group);
  if (helpers.length === 0) {
    return;
  }
  for (const item of helpers) {
    owned.set(item.identity, owner);
    expected.push(item);
  }
  for (const item of helpers) {
    for (const childName of moduleCalls(item, byName)) {
      appendModuleOwned(expected, owned, owner, childName, byName);
    }
  }
}

function ownedGroup(group: readonly ScopeFunction[], owned: ReadonlyMap<string, string>): boolean {
  return group.some((item) => owned.has(item.identity));
}

function helperGroup(group: readonly ScopeFunction[]): ScopeFunction[] {
  const helpers: ScopeFunction[] = [];
  for (const item of group) {
    if (item.role === "helper") {
      helpers.push(item);
    }
  }
  return helpers;
}

export function classFunctionOrder(functions: readonly ScopeFunction[]): FunctionOrder {
  const byName = functionsByCallableName(functions);
  const owned = new Map<string, string>();
  const expected: ScopeFunction[] = [];
  for (const item of functions) {
    if (item.role !== "root") {
      continue;
    }
    expected.push(item);
    for (const childName of classCalls(item, byName)) {
      appendClassOwned(expected, owned, item.identity, childName, byName);
    }
  }
  return { actual: functions, expected, ownerByHelperIdentity: owned };
}

function classCalls(item: ScopeFunction, functionsByName: ReadonlyMap<string, readonly ScopeFunction[]>): string[] {
  return directClassCalls(item, functionsByName);
}

function directClassCalls(
  item: ScopeFunction,
  functionsByName: ReadonlyMap<string, readonly ScopeFunction[]>,
): string[] {
  if (item.body === null) {
    return [];
  }
  const calls: string[] = [];
  collectClassCalls(item.body, item.body, functionsByName, calls);
  return calls;
}

function collectClassCalls(
  root: ts.Node,
  node: ts.Node,
  functionsByName: ReadonlyMap<string, readonly ScopeFunction[]>,
  calls: string[],
): void {
  if (node !== root && isNestedScope(node)) {
    return;
  }
  if (ts.isCallExpression(node)) {
    const name = classCallName(node);
    if (functionsByName.has(name)) {
      calls.push(name);
    }
  }
  ts.forEachChild(node, (child) => collectClassCalls(root, child, functionsByName, calls));
}

function classCallName(call: ts.CallExpression): string {
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return "";
  }
  if (call.expression.expression.kind !== ts.SyntaxKind.ThisKeyword) {
    return "";
  }
  return nameText(call.expression.name);
}

function appendClassOwned(
  expected: ScopeFunction[],
  owned: Map<string, string>,
  owner: string,
  name: string,
  byName: ReadonlyMap<string, readonly ScopeFunction[]>,
): void {
  const group = byName.get(name) ?? [];
  if (ownedGroup(group, owned)) {
    return;
  }
  const helpers = helperGroup(group);
  if (helpers.length === 0) {
    return;
  }
  for (const item of helpers) {
    owned.set(item.identity, owner);
    expected.push(item);
  }
  for (const item of helpers) {
    for (const childName of classCalls(item, byName)) {
      appendClassOwned(expected, owned, owner, childName, byName);
    }
  }
}
