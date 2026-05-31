// File selection — .ts/.tsx, skip .d.ts, skip test/spec, skip @generated.
// Convention pinned per ADR-0001 (forthcoming).

const TEST_PATTERNS: readonly RegExp[] = [/\.test\.tsx?$/, /\.spec\.tsx?$/];
const DECLARATION_PATTERN = /\.d\.ts$/;
const TYPESCRIPT_PATTERN = /\.tsx?$/;

// Explicit list — not configurable. Stepdown-ts-defined convention.
// TypeScript has no canonical generated-file marker (unlike Go's
// "Code generated ... DO NOT EDIT."), so we pin the markers we honor.
const GENERATED_MARKERS: readonly string[] = [
  "// @generated",
  "/* @generated */",
];

export function shouldAnalyze(filePath: string, fileHead: string): boolean {
  if (DECLARATION_PATTERN.test(filePath)) return false;
  if (TEST_PATTERNS.some((p) => p.test(filePath))) return false;
  if (GENERATED_MARKERS.some((m) => fileHead.includes(m))) return false;
  return TYPESCRIPT_PATTERN.test(filePath);
}
