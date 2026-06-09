import type { Diagnostic, ToolError } from "./diagnostic.js";
import { sortDiagnostics } from "./diagnostic.js";
import { loadSourceFiles } from "./compiler.js";
import { moduleDeclarations } from "./declaration.js";
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
  const diagnostics = loaded.sourceFiles.flatMap((sourceFile) =>
    sectionOrderDiagnostics(moduleDeclarations(sourceFile)),
  );
  return { diagnostics: sortDiagnostics(diagnostics), toolError: null };
}
