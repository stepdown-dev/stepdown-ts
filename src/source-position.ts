import path from "node:path";

import ts from "typescript";

export interface SourcePosition {
  readonly path: string;
  readonly line: number;
  readonly column: number;
}

export function sourcePosition(sourceFile: ts.SourceFile, node: ts.Node): SourcePosition {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    path: displayPath(sourceFile.fileName),
    line: position.line + 1,
    column: position.character + 1,
  };
}

export function displayPath(fileName: string): string {
  const absolute = path.resolve(fileName);
  const relative = path.relative(process.cwd(), absolute);
  if (relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return normalizePath(relative);
  }
  return normalizePath(absolute);
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
