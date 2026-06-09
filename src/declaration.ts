import ts from "typescript";

export type ModuleSection = "import" | "declaration" | "behavior";
export type DeclarationKind = "type" | "value" | "root" | "helper" | "other";

export interface ModuleDeclaration {
  readonly sourceFile: ts.SourceFile;
  readonly node: ts.Node;
  readonly section: ModuleSection;
  readonly kind: DeclarationKind;
  readonly name: string;
}

export function moduleDeclarations(sourceFile: ts.SourceFile): ModuleDeclaration[] {
  const declarations: ModuleDeclaration[] = [];
  for (const statement of sourceFile.statements) {
    declarations.push(...statementDeclarations(sourceFile, statement));
  }
  return declarations;
}

function statementDeclarations(sourceFile: ts.SourceFile, statement: ts.Statement): ModuleDeclaration[] {
  if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
    return [moduleDeclaration(sourceFile, statement, "import", "other", "")];
  }
  if (isTypeDeclaration(statement)) {
    return [moduleDeclaration(sourceFile, statement, "declaration", "type", declarationName(statement))];
  }
  if (isModuleValueDeclaration(statement)) {
    return [moduleDeclaration(sourceFile, statement, "declaration", "value", declarationName(statement))];
  }
  if (ts.isVariableStatement(statement)) {
    return variableDeclarations(sourceFile, statement);
  }
  if (isBehaviorDeclaration(statement)) {
    return [behaviorDeclaration(sourceFile, statement)];
  }
  return [moduleDeclaration(sourceFile, statement, "behavior", "other", "")];
}

function moduleDeclaration(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  section: ModuleSection,
  kind: DeclarationKind,
  name: string,
): ModuleDeclaration {
  return { sourceFile, node, section, kind, name };
}

function isTypeDeclaration(statement: ts.Statement): boolean {
  return (
    ts.isTypeAliasDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  );
}

function declarationName(statement: ts.Statement): string {
  if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) {
    return statement.name.text;
  }
  if (ts.isModuleDeclaration(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    return nameText(statement.name);
  }
  return "";
}

function isModuleValueDeclaration(statement: ts.Statement): boolean {
  return ts.isModuleDeclaration(statement);
}

function variableDeclarations(sourceFile: ts.SourceFile, statement: ts.VariableStatement): ModuleDeclaration[] {
  const declarations: ModuleDeclaration[] = [];
  for (const declaration of statement.declarationList.declarations) {
    const section = variableSection(declaration);
    const kind = variableKind(statement, declaration);
    const name = nameText(declaration.name);
    declarations.push(moduleDeclaration(sourceFile, declaration, section, kind, name));
  }
  return declarations;
}

function variableSection(declaration: ts.VariableDeclaration): ModuleSection {
  return isDirectFunctionLiteral(declaration.initializer) ? "behavior" : "declaration";
}

function isDirectFunctionLiteral(node: ts.Expression | undefined): boolean {
  return node !== undefined && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

function variableKind(statement: ts.VariableStatement, declaration: ts.VariableDeclaration): DeclarationKind {
  if (!isDirectFunctionLiteral(declaration.initializer)) {
    return "value";
  }
  return hasExportModifier(statement) ? "root" : "helper";
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    modifiersOf(node).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function modifiersOf(node: ts.Node): readonly ts.ModifierLike[] {
  if (!ts.canHaveModifiers(node)) {
    return [];
  }
  return ts.getModifiers(node) ?? [];
}

function isBehaviorDeclaration(statement: ts.Statement): boolean {
  return ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement);
}

function behaviorDeclaration(sourceFile: ts.SourceFile, statement: ts.Statement): ModuleDeclaration {
  return moduleDeclaration(sourceFile, statement, "behavior", behaviorKind(statement), declarationName(statement));
}

function behaviorKind(statement: ts.Statement): DeclarationKind {
  if (ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) {
    return hasExportModifier(statement) ? "root" : "helper";
  }
  return "other";
}

export function nameText(name: ts.Node | undefined): string {
  if (name === undefined) {
    return "";
  }
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return "";
}
