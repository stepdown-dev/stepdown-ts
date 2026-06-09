import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

import type { ToolError } from "./diagnostic.js";
import { shouldAnalyze } from "./file-selection.js";

interface SourceLoad {
  readonly sourceFiles: readonly ts.SourceFile[];
  readonly toolError: ToolError | null;
}

interface CompilerSetup {
  readonly options: ts.CompilerOptions;
  readonly toolError: ToolError | null;
}

const FILE_HEAD_BYTES = 2048;

const DEFAULT_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  jsx: ts.JsxEmit.Preserve,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
};

const JSX_INTRINSICS_PATH = path.join(process.cwd(), "__jsx_intrinsics.d.ts");
const JSX_INTRINSICS_TEXT =
  "declare namespace JSX { interface IntrinsicElements { [elementName: string]: unknown; } }\n";

export async function loadSourceFiles(inputPaths: readonly string[]): Promise<SourceLoad> {
  const selectedPaths = await selectedSourcePaths(inputPaths);
  if (selectedPaths.toolError) {
    return { sourceFiles: [], toolError: selectedPaths.toolError };
  }
  const setup = compilerSetup();
  if (setup.toolError) {
    return { sourceFiles: [], toolError: setup.toolError };
  }
  const program = ts.createProgram(
    [...selectedPaths.paths, JSX_INTRINSICS_PATH],
    setup.options,
    compilerHost(setup.options),
  );
  const selected = new Set(selectedPaths.paths.map((filePath) => path.resolve(filePath)));
  const toolError = compilerFailure(program, selected);
  if (toolError) {
    return { sourceFiles: [], toolError };
  }
  return {
    sourceFiles: program
      .getSourceFiles()
      .filter((sourceFile) => selected.has(path.resolve(sourceFile.fileName))),
    toolError: null,
  };
}

async function selectedSourcePaths(inputPaths: readonly string[]): Promise<{
  readonly paths: readonly string[];
  readonly toolError: ToolError | null;
}> {
  const selected = new Set<string>();
  for (const inputPath of inputPaths) {
    const result = await selectInputPath(inputPath);
    if (result.toolError) {
      return { paths: [], toolError: result.toolError };
    }
    for (const sourcePath of result.paths) {
      selected.add(sourcePath);
    }
  }
  return { paths: [...selected].sort(), toolError: null };
}

async function selectInputPath(inputPath: string): Promise<{
  readonly paths: readonly string[];
  readonly toolError: ToolError | null;
}> {
  const absolute = path.resolve(inputPath);
  try {
    const entry = await stat(absolute);
    if (entry.isDirectory()) {
      return selectDirectory(absolute);
    }
    if (entry.isFile()) {
      return selectFile(absolute);
    }
    return { paths: [], toolError: toolError("unsupported-path", `path is not a file or directory: ${inputPath}`) };
  } catch (error) {
    if (isMissingPath(error)) {
      return { paths: [], toolError: toolError("path-not-found", `path does not exist: ${inputPath}`) };
    }
    return { paths: [], toolError: toolError("path-unreadable", `path cannot be read: ${inputPath}`) };
  }
}

async function selectDirectory(directory: string): Promise<{
  readonly paths: readonly string[];
  readonly toolError: ToolError | null;
}> {
  const entries = await directoryEntries(directory);
  if (entries.toolError) {
    return { paths: [], toolError: entries.toolError };
  }
  const selected: string[] = [];
  for (const entry of [...entries.values].sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const child = await selectDirectory(entryPath);
      if (child.toolError) {
        return child;
      }
      selected.push(...child.paths);
    } else if (entry.isFile()) {
      const file = await selectFile(entryPath);
      if (file.toolError) {
        return file;
      }
      selected.push(...file.paths);
    }
  }
  return { paths: selected, toolError: null };
}

async function directoryEntries(directory: string): Promise<{
  readonly values: readonly Dirent[];
  readonly toolError: ToolError | null;
}> {
  try {
    return { values: await readdir(directory, { withFileTypes: true }), toolError: null };
  } catch {
    return { values: [], toolError: toolError("path-unreadable", `directory cannot be read: ${directory}`) };
  }
}

function toolError(code: string, message: string): ToolError {
  return { code, message };
}

async function selectFile(filePath: string): Promise<{
  readonly paths: readonly string[];
  readonly toolError: ToolError | null;
}> {
  try {
    const head = await fileHead(filePath);
    return { paths: shouldAnalyze(filePath, head) ? [filePath] : [], toolError: null };
  } catch {
    return { paths: [], toolError: toolError("path-unreadable", `path cannot be read: ${filePath}`) };
  }
}

async function fileHead(filePath: string): Promise<string> {
  const text = await readFile(filePath, "utf8");
  return text.slice(0, FILE_HEAD_BYTES);
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function compilerSetup(): CompilerSetup {
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    return { options: DEFAULT_OPTIONS, toolError: null };
  }
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    return { options: DEFAULT_OPTIONS, toolError: compilerDiagnostic("tsconfig-load-failure", config.error) };
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const parseError = parsed.errors[0];
  if (parseError) {
    return { options: DEFAULT_OPTIONS, toolError: compilerDiagnostic("tsconfig-load-failure", parseError) };
  }
  const options = analysisOptions(parsed.options);
  return { options, toolError: null };
}

function compilerDiagnostic(code: string, diagnostic: ts.Diagnostic): ToolError {
  return toolError(code, ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
}

function analysisOptions(options: ts.CompilerOptions): ts.CompilerOptions {
  const analyzed = { ...DEFAULT_OPTIONS, ...options, noEmit: true };
  analyzed.jsx = ts.JsxEmit.Preserve;
  delete analyzed.rootDir;
  delete analyzed.outDir;
  delete analyzed.declarationDir;
  delete analyzed.tsBuildInfoFile;
  analyzed.declaration = false;
  analyzed.declarationMap = false;
  analyzed.emitDeclarationOnly = false;
  analyzed.sourceMap = false;
  return analyzed;
}

function compilerHost(options: ts.CompilerOptions): ts.CompilerHost {
  const host = ts.createCompilerHost(options);
  const hostFileExists = host.fileExists.bind(host);
  const hostReadFile = host.readFile.bind(host);
  const hostSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => path.resolve(fileName) === JSX_INTRINSICS_PATH || hostFileExists(fileName);
  host.readFile = (fileName) =>
    path.resolve(fileName) === JSX_INTRINSICS_PATH ? JSX_INTRINSICS_TEXT : hostReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (path.resolve(fileName) === JSX_INTRINSICS_PATH) {
      return ts.createSourceFile(fileName, JSX_INTRINSICS_TEXT, languageVersion, true, ts.ScriptKind.TS);
    }
    return hostSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  return host;
}

function compilerFailure(program: ts.Program, selected: ReadonlySet<string>): ToolError | null {
  const syntactic = firstSelectedDiagnostic(program.getSyntacticDiagnostics(), selected);
  if (syntactic) {
    return compilerDiagnostic("parse-failure", syntactic);
  }
  const semantic = firstSelectedDiagnostic(program.getSemanticDiagnostics(), selected);
  if (semantic) {
    return compilerDiagnostic("type-check-failure", semantic);
  }
  return null;
}

function firstSelectedDiagnostic(
  diagnostics: readonly ts.Diagnostic[],
  selected: ReadonlySet<string>,
): ts.Diagnostic | null {
  for (const diagnostic of diagnostics) {
    if (selectedDiagnostic(diagnostic, selected)) {
      return diagnostic;
    }
  }
  return null;
}

function selectedDiagnostic(diagnostic: ts.Diagnostic, selected: ReadonlySet<string>): boolean {
  return diagnostic.file === undefined || selected.has(path.resolve(diagnostic.file.fileName));
}
