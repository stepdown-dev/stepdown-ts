// stepdown-ts CLI entrypoint.
// Exit codes: 0 clean (or help), 1 findings, 2 tool/load/parse error.

import { runStepdown } from "./walker.js";
import { formatDiagnostic, formatToolError, sortDiagnostics } from "./diagnostic.js";

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.length === 0 || isHelpFlag(args[0])) {
    printUsage();
    return 0;
  }

  const result = await runStepdown({ paths: args });

  if (result.toolError) {
    console.error(formatToolError("tool-error", result.toolError.message));
    return 2;
  }

  const sorted = sortDiagnostics(result.diagnostics);
  for (const d of sorted) {
    console.log(formatDiagnostic(d));
  }

  return sorted.length > 0 ? 1 : 0;
}

function isHelpFlag(arg: string | undefined): boolean {
  return arg === "-h" || arg === "--help" || arg === "-help";
}

function printUsage(): void {
  console.log("Usage: stepdown-ts <path> [<path>...]");
  console.log("  Structural source analyzer for TypeScript files.");
  console.log("  See https://stepdown.dev/ts for documentation.");
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(formatToolError("tool-error", message));
    process.exit(2);
  });
