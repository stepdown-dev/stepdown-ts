// Diagnostic shape + text formatter.
// Format: `path:line:column: rule-name: description` (Go-toolchain family format).
// Tool errors drop the path: `rule-name: description`.

export interface Diagnostic {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly rule: string;
  readonly description: string;
}

export interface ToolError {
  readonly code: string;
  readonly message: string;
}

export function formatDiagnostic(d: Diagnostic): string {
  return `${d.path}:${d.line}:${d.column}: ${d.rule}: ${d.description}`;
}

export function formatToolError(rule: string, description: string): string {
  return `${rule}: ${description}`;
}

export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0;
  });
}
