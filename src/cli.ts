import { formatDiagnostic, formatToolError, sortDiagnostics } from "./diagnostic.js";
import type { RunOptions, RunResult } from "./walker.js";
import { runStepdown } from "./walker.js";

export interface CliOutput {
  readonly writeStdout: (text: string) => void;
  readonly writeStderr: (text: string) => void;
}

export type StepdownRunner = (options: RunOptions) => Promise<RunResult>;

type ParsedArgs =
  | { readonly kind: "run"; readonly paths: readonly string[] }
  | { readonly kind: "help" }
  | { readonly kind: "error"; readonly message: string };

const USAGE = "Usage: stepdown-ts <path> [<path>...]\n";
const HELP_LINES = [
  USAGE,
  "  Structural source analyzer for TypeScript and TSX files.\n",
  "\n",
  "Help:\n",
  "  stepdown-ts -h\n",
  "  stepdown-ts --help\n",
  "  stepdown-ts -help\n",
  "\n",
  "Exit codes:\n",
  "  0 clean input or help\n",
  "  1 structural findings\n",
  "  2 tool, load, parse, or type-check error\n",
  "\n",
  "See README.md and ADR-0001 for the structural grammar.\n",
] as const;
const processOutput: CliOutput = {
  writeStdout: (text) => process.stdout.write(text),
  writeStderr: (text) => process.stderr.write(text),
};

export async function runCli(
  args: readonly string[],
  output: CliOutput = processOutput,
  runner: StepdownRunner = runStepdown,
): Promise<number> {
  const request = parseArgs(args);
  if (request.kind === "help") {
    printUsage(output);
    return 0;
  }
  if (request.kind === "error") {
    output.writeStderr(formatToolError("tool-error", request.message) + "\n");
    return 2;
  }
  const result = await runner({ paths: request.paths });
  if (result.toolError) {
    output.writeStderr(formatToolError(result.toolError.code, result.toolError.message) + "\n");
    return 2;
  }
  const diagnostics = sortDiagnostics(result.diagnostics);
  for (const diagnostic of diagnostics) {
    output.writeStdout(formatDiagnostic(diagnostic) + "\n");
  }
  return diagnostics.length > 0 ? 1 : 0;
}

function parseArgs(args: readonly string[]): ParsedArgs {
  if (args.length === 0) {
    return { kind: "error", message: "input path required" };
  }
  if (hasHelpFlag(args)) {
    if (args.length === 1) {
      return { kind: "help" };
    }
    return { kind: "error", message: "help flag cannot be combined with input paths" };
  }
  return { kind: "run", paths: args };
}

function hasHelpFlag(args: readonly string[]): boolean {
  for (const arg of args) {
    if (isHelpFlag(arg)) {
      return true;
    }
  }
  return false;
}

function isHelpFlag(arg: string): boolean {
  return arg === "-h" || arg === "--help" || arg === "-help";
}

function printUsage(output: CliOutput): void {
  for (const line of HELP_LINES) {
    output.writeStdout(line);
  }
}

export async function main(): Promise<void> {
  try {
    process.exitCode = await runCli(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(formatToolError("tool-error", message) + "\n");
    process.exitCode = 2;
  }
}
