import ts from "typescript";

import type { FunctionOrder } from "./call-graph.js";
import type { Diagnostic, ToolError } from "./diagnostic.js";
import {
  classFunctions,
  classFunctionOrder,
  moduleFunctions,
  moduleFunctionOrder,
} from "./call-graph.js";
import { classRecords } from "./class-member.js";
import { loadSourceFiles } from "./compiler.js";
import { moduleDeclarations } from "./declaration.js";
import { sortDiagnostics } from "./diagnostic.js";
import { accessorPairDiagnostics } from "./rules/accessor-pair.js";
import { classMemberOrderDiagnostics } from "./rules/class-member-order.js";
import { declarationZoneOrderDiagnostics } from "./rules/declaration-zone-order.js";
import { dfsPublicRootDiagnostics } from "./rules/dfs-public-root.js";
import { helperPlacementDiagnostics } from "./rules/helper-placement.js";
import { orphanUnexportedHelperDiagnostics } from "./rules/orphan-unexported-helper.js";
import { sectionOrderDiagnostics } from "./rules/section-order.js";

export interface RunOptions {
  readonly paths: readonly string[];
}

export interface RunResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly toolError: ToolError | null;
}

export async function runStepdown(options: RunOptions): Promise<RunResult> {
  if (options.paths.length === 0) {
    return { diagnostics: [], toolError: { code: "tool-error", message: "input path required" } };
  }
  const loaded = await loadSourceFiles(options.paths);
  if (loaded.toolError) {
    return { diagnostics: [], toolError: loaded.toolError };
  }
  const diagnostics: Diagnostic[] = [];
  for (const sourceFile of loaded.sourceFiles) {
    diagnostics.push(...sourceDiagnostics(sourceFile));
  }
  return { diagnostics: sortDiagnostics(diagnostics), toolError: null };
}

function sourceDiagnostics(sourceFile: ts.SourceFile): Diagnostic[] {
  const declarations = moduleDeclarations(sourceFile);
  const records = classRecords(sourceFile);
  const diagnostics = [
    ...sectionOrderDiagnostics(declarations),
    ...declarationZoneOrderDiagnostics(declarations),
    ...functionOrderDiagnostics(moduleFunctionOrder(moduleFunctions(declarations))),
    ...classMemberOrderDiagnostics(records),
    ...accessorPairDiagnostics(records),
  ];
  for (const record of records) {
    diagnostics.push(...functionOrderDiagnostics(classFunctionOrder(classFunctions(record))));
  }
  return diagnostics;
}

function functionOrderDiagnostics(order: FunctionOrder): Diagnostic[] {
  return [
    ...dfsPublicRootDiagnostics(order),
    ...helperPlacementDiagnostics(order),
    ...orphanUnexportedHelperDiagnostics(order),
  ];
}
