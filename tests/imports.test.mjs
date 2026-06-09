import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import ts from "typescript";

const PERMITTED_BARE_SPECIFIERS = new Set(["typescript"]);

test("production imports stay inside declared boundaries", async () => {
  const failures = [];

  for (const sourcePath of await sourcePaths("src")) {
    const text = await readFile(sourcePath, "utf8");
    const sourceFile = ts.createSourceFile(sourcePath, text, ts.ScriptTarget.ES2022, true);
    for (const specifier of moduleSpecifiers(sourceFile)) {
      if (!permittedSpecifier(specifier)) {
        failures.push(`${sourcePath}: ${specifier}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

async function sourcePaths(directory) {
  const paths = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await sourcePaths(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      paths.push(entryPath);
    }
  }
  return paths.sort();
}

function moduleSpecifiers(sourceFile) {
  const specifiers = [];
  for (const statement of sourceFile.statements) {
    const specifier = moduleSpecifier(statement);
    if (specifier !== null) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function moduleSpecifier(statement) {
  if (ts.isImportDeclaration(statement)) {
    return stringLiteralText(statement.moduleSpecifier);
  }
  if (ts.isExportDeclaration(statement)) {
    return stringLiteralText(statement.moduleSpecifier);
  }
  return null;
}

function stringLiteralText(node) {
  return node !== undefined && ts.isStringLiteral(node) ? node.text : null;
}

function permittedSpecifier(specifier) {
  return (
    specifier.startsWith(".") ||
    specifier.startsWith("node:") ||
    PERMITTED_BARE_SPECIFIERS.has(specifier)
  );
}
