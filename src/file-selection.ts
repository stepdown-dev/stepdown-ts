const TEST_PATTERNS: readonly RegExp[] = [/\.test\.tsx?$/, /\.spec\.tsx?$/];
const DECLARATION_PATTERN = /\.d\.ts$/;
const TYPESCRIPT_PATTERN = /\.tsx?$/;

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
