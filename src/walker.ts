// stepdown-ts walker — AST-local structural analyzer over the TypeScript compiler API.
// Implementation gated on ADR-0001 ratification.

import type { Diagnostic } from "./diagnostic.js";

export interface RunOptions {
  readonly paths: readonly string[];
}

export interface RunResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly toolError: Error | null;
}

export async function runStepdown(_options: RunOptions): Promise<RunResult> {
  // TODO: implement per ADR-0001 once skeleton + Principles doc land.
  // Walker reads valid TypeScript source via the `typescript` compiler API,
  // applies positive-grammar rules from src/rules/, and emits text diagnostics.
  return { diagnostics: [], toolError: null };
}
