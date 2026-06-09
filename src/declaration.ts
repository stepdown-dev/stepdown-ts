import ts from "typescript";

export type ModuleSection = "import" | "declaration" | "behavior";

export interface ModuleDeclaration {
  readonly sourceFile: ts.SourceFile;
  readonly node: ts.Node;
  readonly section: ModuleSection;
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
    return [moduleDeclaration(sourceFile, statement, "import")];
  }
  if (isTypeDeclaration(statement) || isModuleValueDeclaration(statement)) {
    return [moduleDeclaration(sourceFile, statement, "declaration")];
  }
  if (ts.isVariableStatement(statement)) {
    return variableDeclarations(sourceFile, statement);
  }
  if (isBehaviorDeclaration(statement)) {
    return [moduleDeclaration(sourceFile, statement, "behavior")];
  }
  return [moduleDeclaration(sourceFile, statement, "behavior")];
}

function variableDeclarations(sourceFile: ts.SourceFile, statement: ts.VariableStatement): ModuleDeclaration[] {
  return statement.declarationList.declarations.map((declaration) =>
    moduleDeclaration(sourceFile, declaration, variableSection(declaration)),
  );
}

function variableSection(declaration: ts.VariableDeclaration): ModuleSection {
  return isDirectFunctionLiteral(declaration.initializer) ? "behavior" : "declaration";
}

function moduleDeclaration(sourceFile: ts.SourceFile, node: ts.Node, section: ModuleSection): ModuleDeclaration {
  return { sourceFile, node, section };
}

function isTypeDeclaration(statement: ts.Statement): boolean {
  return (
    ts.isTypeAliasDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  );
}

function isModuleValueDeclaration(statement: ts.Statement): boolean {
  return ts.isModuleDeclaration(statement);
}

function isBehaviorDeclaration(statement: ts.Statement): boolean {
  return ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement);
}

function isDirectFunctionLiteral(node: ts.Expression | undefined): boolean {
  return node !== undefined && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}
