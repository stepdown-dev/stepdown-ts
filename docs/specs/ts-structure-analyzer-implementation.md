# TypeScript Structure Analyzer Implementation Spec

Status: Draft for v0.1.0 implementation
Date: 2026-06-09
Authority: [ADR-0001](../adrs/0001-stepdown-ts-structure-analyzer.md)
Target release: v0.1.0

## Problem And Success

ADR-0001 ratifies the TypeScript structure analyzer grammar, but the current repository is still a scaffold. The v0.1.0 implementation must turn the ADR grammar into an executable TypeScript analyzer without weakening the stepdown-dev Principles contract.

Success means:

- `stepdown-ts <path> [<path>...]` analyzes TypeScript and TSX source selected by ADR-0001.
- The analyzer uses the TypeScript compiler API directly.
- Diagnostics use the exact `path:line:column: rule-name: description` text contract and deterministic path, line, column, rule sorting.
- Exit codes are exact: `0` for clean/help, `1` for findings, `2` for load, parse, type-check, or tool failures.
- The walker is a positive grammar implementation, not a rejected-shape catalog.
- Every v0.1.0 rule has sparse positive witness fixtures under `fixtures/positive/<rule>/<case>.ts` or `.tsx`.
- Repository self-check and fixture-check gates run through package scripts.

Failure looks like a checker that only tests known bad examples, accepts malformed TypeScript as analyzer input, depends on waiver/config state, leaves the CLI contract ambiguous, or forces future maintainers to infer rule ownership from a mixed bucket file.

## Section 2.7 Guarantee Preservation Table

| Source guarantee | v0.1.0 preservation requirement | Verification surface |
| --- | --- | --- |
| Structural-only analysis | Rules inspect declaration order, section order, class member order, and direct same-scope call order only. They do not enforce style, naming taste, security, runtime behavior, API design, formatting, or domain semantics. | Positive fixture review and source sweep for rule descriptions. |
| Positive grammar only | Rule code walks accepted TypeScript structure and emits diagnostics for positions that cannot be reconciled with that accepted grammar. It does not encode denied-example catalogs, malformed fixture corpora, or violation-type switches as the source of truth. | Source sweep for rejected-shape artifacts, negative fixture directories, and violation switch naming. |
| No configuration and no waivers | Analyzer behavior is fixed by ADR-0001. There is no project config file, inline ignore directive, allow-list, waiver registry, or per-rule toggle. | Source sweep plus positive fixture check. |
| Same-file, same-scope DFS | Public roots and private callees are related only when the direct call is statically resolvable inside one module scope or one class scope. Cross-module, inherited, callback, dynamic, polymorphic, and other-object dispatch are out of scope. | Positive fixtures plus direct source inspection of call extraction bounds. |
| TypeScript-native grammar | The implementation treats module sections, arrow-const functions, class accessors, static members, TSX files, declaration files, generated markers, and TypeScript parse/type-check failures as TypeScript contracts, not as translated sibling-language rules. | Positive fixtures, file-selection plumbing tests, and compiler-load tests. |
| Reviewable walker | Classification, source ordering, graph building, diagnostics, and rule emission live in small responsibility-shaped modules. A reader can trace each diagnostic back to an ADR rule. | File-shape review and self-check. |
| Self-policing | The package analyzes its own `src` tree and positive witnesses before release. | `npm run self-check`, `npm run fixture-check`, `npm run ci`. |
| ADR-driven evolution | v0.1.0 implements ADR-0001 only. New rule families, config, waivers, expanded call graph analysis, or packaging guarantees require a later ADR. | Release checklist and docs review. |

## Grounding And Authority

Authoritative sources:

- stepdown-dev Principles document at `https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md`.
- ADR-0001 in this repository.
- Current repository scaffold in `src/`, `.github/workflows/ci.yml`, `package.json`, and `README.md`.
- Reference structure from the sibling repository specs, adapted only where TypeScript and ADR-0001 require it.

Current-code facts:

- `package.json` declares package `@stepdown-dev/ts`, binary `stepdown-ts`, `type: "module"`, Node `>=20`, dependency `typescript`, and scripts `build`, `self-check`, `fixture-check`, and `ci`.
- `src/walker.ts` currently returns no diagnostics and must become the analyzer entry.
- `src/file-selection.ts` already encodes the ADR file-extension, test/spec, declaration-file, and generated-marker selection rules.
- `src/diagnostic.ts` already defines the public diagnostic shape, formatter, and deterministic sorter.
- Rule name modules already exist under `src/rules/`, but rule behavior is not implemented.
- `.github/workflows/ci.yml` already builds, runs self-check, and runs fixture-check.

## Scope And Exclusions

In scope:

- CLI argument handling, help/error behavior, analyzer execution, and exit-code mapping.
- TypeScript compiler loading for input paths and `tsconfig.json` discovery where the compiler API supplies it.
- ADR-0001 file selection.
- Module-level section order.
- Declaration-zone type/interface/enum before const order.
- Module public-root DFS and helper placement.
- Orphan unexported helper detection.
- Class member order, public-method DFS, private-method placement, accessor-pair adjacency, and static-last behavior.
- Deterministic diagnostics.
- Positive witness fixtures and fixture-check harness.
- Self-policing over the package `src` tree.

Out of scope:

- Config files, rule toggles, inline ignore directives, or waiver channels.
- Negative fixture suites, expected-output text files, or rejected-shape catalogs.
- Cross-module call graph analysis.
- Callback, dynamic dispatch, inherited method, `super`, other-object, cast-based, or type-flow analysis.
- Formatting, style, security, performance, API, package-boundary, or accessibility checks.
- Factory-function detection.
- Binary distribution guarantees beyond the package `bin` field and stable CLI behavior.
- Changes to root public-policy files assigned to a separate repository hygiene pass.

## ADR Requirement Map

| ADR requirement | Implementation responsibility | Proof responsibility |
| --- | --- | --- |
| Include `.ts` and `.tsx` | File selector admits both file extensions. | Focused file-selection plumbing tests with accepted files. |
| Exclude `.d.ts`, `*.test.ts(x)`, `*.spec.ts(x)` | File selector rejects declaration and test/spec files before parse. | Focused file-selection plumbing tests for source admission. |
| Exclude generated files with `// @generated` or `/* @generated */` in file head | File selector reads enough file head to apply the marker rule. | Focused file-selection plumbing tests for source admission. |
| Imports before declaration zone before behavior zone | Module walker partitions top-level declarations and emits `section-order`. | Positive fixture coverage plus direct source inspection of the emission path. |
| Types/interfaces/enums before module const declarations | Declaration-zone walker emits `declaration-zone-order`. | Positive fixture coverage plus direct source inspection of the emission path. |
| Direct arrow/function-literal const initializer is behavior | Classifier places these const declarations in the behavior zone. | Positive fixture coverage plus direct source inspection of classifier predicates. |
| Other const declarations are declaration-zone values | Classifier keeps non-function const declarations in declaration zone. | Positive fixture coverage plus direct source inspection of classifier predicates. |
| Public roots followed by unexported direct callees in DFS preorder | Same-file module graph emits `dfs-public-root` and `helper-placement`. | Positive fixture coverage plus direct source inspection of graph extraction and DFS emission. |
| Unexported helper not reached from any public root is rejected | Module graph emits `orphan-unexported-helper`. | Direct source inspection of orphan detection; positive fixtures prove reachable helpers remain accepted. |
| Same-scope DFS only | Graph ignores out-of-scope calls rather than guessing. | Direct source inspection of extractor bounds; positive fixtures avoid unsupported dispatch forms. |
| Class fields, constructor, public methods, private methods, statics last | Class walker emits `class-member-order`. | Positive fixture coverage plus direct source inspection of class-section emission. |
| Public class methods followed by private `this.method()` callees | Class graph emits DFS/member placement diagnostics. | Positive fixture coverage plus direct source inspection of class graph extraction. |
| Getter/setter pair for same property adjacent | Accessor pass emits `accessor-pair`. | Positive fixture coverage plus direct source inspection of accessor grouping. |
| Static blocks and static members last | Class walker places static elements after instance sections. | Positive fixture coverage plus direct source inspection of static-section ordering. |
| Diagnostic output format | Formatter returns exact ADR text shape. | Formatter tests. |
| Sort diagnostics by path, line, column, rule | Sorter remains deterministic. | Sort tests. |
| Exit code `2` for load/parse/type-check failures | CLI maps tool failures separately from findings. | CLI tests. |

## Contract Model

### CLI Contract

Command:

```sh
stepdown-ts <path> [<path>...]
stepdown-ts -h
stepdown-ts --help
stepdown-ts -help
```

Requirements:

- Help flags print usage to stdout and exit `0`.
- Zero input paths are a tool error, print to stderr, and exit `2`.
- A help flag mixed with input paths is a tool error and exits `2`.
- Missing paths, unreadable paths, TypeScript parse failures, TypeScript type-check failures, and analyzer exceptions exit `2`.
- Findings print to stdout and exit `1`.
- A clean run prints no diagnostics and exits `0`.

The current scaffold exits `0` on zero args; v0.1.0 must correct that.

### Programmatic Contract

`runStepdown({ paths })` returns:

- `diagnostics`: ordered by the caller after collection or already sorted by the walker, but exposed deterministically through the CLI.
- `toolError`: `null` for analyzed source, non-null for load, parse, type-check, selection, or internal analyzer failures.

The public API must not expose rule-internal traversal records as stable data.

### Diagnostic Contract

Each finding:

- Carries one of the ADR-0001 rule names.
- Points at the declaration or member whose source order violates the positive grammar.
- Uses 1-based line and column positions from the TypeScript source file.
- Uses repository-relative paths when the input path is inside the current working directory, and stable normalized paths otherwise.

Tool failures:

- Use `parse-failure`, `type-check-failure`, `tsconfig-load-failure`, or a local tool-error code only for non-rule execution failures.
- Do not use fake file positions unless the compiler supplies one.

## Boundary And Ownership Model

Expected source layout:

- `src/cli.ts`: argument parsing, help text, stderr/stdout routing, exit-code selection.
- `src/index.ts`: stable programmatic exports only.
- `src/file-selection.ts`: ADR file selection, generated-marker checks, and path admission.
- `src/compiler.ts`: TypeScript project/path loading, source-file collection, parse/type-check failure conversion.
- `src/source-position.ts`: 1-based line/column and normalized path helpers.
- `src/declaration.ts`: module-level declaration records, class-member records, and source-order spans.
- `src/classify-declaration.ts`: top-level declaration classification.
- `src/classify-member.ts`: class-member classification.
- `src/call-graph.ts`: direct same-scope call extraction and DFS ordering records.
- `src/walker.ts`: analyzer orchestration from compiler files to diagnostics.
- `src/rules/section-order.ts`: module section order only.
- `src/rules/declaration-zone-order.ts`: declaration-zone order only.
- `src/rules/dfs-public-root.ts`: module public-root DFS only.
- `src/rules/helper-placement.ts`: helper placement diagnostics only.
- `src/rules/orphan-unexported-helper.ts`: orphan helper diagnostics only.
- `src/rules/accessor-pair.ts`: accessor adjacency only.
- `src/rules/class-member-order.ts`: class member ordering only.
- `src/rules/index.ts`: rule-name registry only.

Names may be adjusted if a tighter TypeScript name improves clarity, but each file must keep one responsibility. Do not collapse rule behavior into one mixed `rules.ts` or one mixed `model.ts` bucket.

## Implementation Architecture

### Source Loading

The loader accepts file and directory paths. Directory paths are expanded recursively through TypeScript source files after applying ADR exclusions. If a `tsconfig.json` is available for the selected source set, compiler setup honors the TypeScript compiler configuration for parsing and type-checking. If no config is found, the loader still parses selected source files with stable defaults suitable for ESM TypeScript and TSX.

The loader fails closed:

- Any unreadable path is a tool error.
- Any compiler configuration load failure is a `tsconfig-load-failure`.
- Any parse diagnostic for an analyzed file is a `parse-failure`.
- Any type-check diagnostic for an analyzed file is a `type-check-failure`.

### Declaration Model

The analyzer first converts TypeScript AST nodes into local records:

- `ModuleDeclarationRecord` for imports, types, interfaces, enums, consts, exported functions, exported classes, exported arrow/function consts, unexported functions, and unexported arrow/function consts.
- `ClassMemberRecord` for fields, constructors, accessors, public methods, private methods, static methods, static fields, and static blocks.
- Source order is stored as source-file index and position span, not as emitted text.

Declaration records are internal. They are not exported as a public API guarantee.

### Classification

Module-level declaration classification:

- Import declarations are import section.
- Type aliases, interfaces, and enums are declaration-zone type records.
- Const declarations with direct arrow-function or function-expression initializers are function records.
- Const declarations without direct function-literal initializers are declaration-zone value records.
- Exported functions, exported classes, and exported function-literal consts are public roots.
- Unexported functions and unexported function-literal consts are helpers.

Class-member classification:

- Instance fields before constructor.
- Constructor before instance behavior.
- Public instance methods are public roots.
- Private instance methods are helper methods.
- Accessors for the same property must be adjacent.
- Static fields, methods, and blocks are static section and must be last.

### Same-Scope Call Extraction

The graph extractor recognizes only direct local calls:

- Module scope: `helper()` where `helper` is a same-file unexported function or function-literal const in module scope.
- Class scope: `this.helper()` where `helper` is a private method in the same class.

The extractor ignores:

- Imported calls.
- Object calls such as `other.helper()`.
- `super.helper()`.
- Inherited or interface-dispatched methods.
- Computed property calls.
- Callback call order.
- Dynamic calls through aliases, casts, arrays, maps, decorators, or reflection.
- Calls across files.

Ignored calls are not diagnostics by themselves. The grammar is bounded; it does not guess.

### Rule Emission

Rule modules receive normalized records and return diagnostics. They do not read the filesystem, parse TypeScript, sort output, or select exit codes. The walker owns orchestration; rule modules own only their rule.

## Implementation Slice Plan

1. CLI and result contract
   - Correct zero-arg and mixed-help behavior.
   - Keep stdout/stderr and exit-code behavior testable without process termination.
   - Acceptance: CLI tests cover help, zero args, clean run, findings, and tool error.

2. Source loading and file selection
   - Expand files/directories.
   - Apply ADR exclusions.
   - Convert load, parse, and type-check failures into tool errors.
   - Acceptance: file-selection and compiler-load tests cover each inclusion/exclusion and failure class.

3. Declaration and member records
   - Build source-ordered module and class records.
   - Keep records internal to analyzer packages.
   - Acceptance: record tests cover imports, type/interface/enum, const value, function-literal const, functions, classes, fields, constructor, methods, accessors, and statics.

4. Classifiers
   - Implement module and class classification from ADR-0001.
   - Acceptance: positive fixtures cover classifier outcomes; source inspection confirms direct function literals, computed values, public roots, and helpers are classified by positive grammar predicates.

5. Module section and declaration-zone rules
   - Implement `section-order` and `declaration-zone-order`.
   - Acceptance: positive fixtures pass; source inspection confirms diagnostic emission is derived from accepted section grammar.

6. Module DFS and helper rules
   - Implement public-root DFS, helper placement, and orphan helper detection.
   - Acceptance: positive fixtures pass; source inspection confirms same-scope call extraction, DFS emission, ignored dispatch classes, and orphan detection are bounded by ADR-0001.

7. Class member and accessor rules
   - Implement class ordering, public-method DFS to private methods, accessor adjacency, and static-last behavior.
   - Acceptance: positive fixtures pass; source inspection confirms class-section, accessor, static-last, and private-callee emission paths.

8. Fixture harness
   - Add `fixtures/positive/<rule>/<case>.ts` or `.tsx`.
   - Ensure `npm run fixture-check` expects zero diagnostics for positive fixtures.
   - Acceptance: fixture-check fails if a positive fixture emits any diagnostic.

9. Self-policing and release readiness
   - `npm run self-check` runs analyzer over `src`.
   - `npm run ci` runs build, self-check, and fixture-check.
   - Acceptance: `npm run ci` passes from a clean checkout.

## Acceptance Criteria Per Unit

Each implementation unit must include proof appropriate to the surface it changes. Structural grammar is proven by positive witnesses plus direct walker/source inspection. Focused tests are reserved for CLI, file-selection, load, parse, type-check, diagnostic formatting, diagnostic sorting, and other tool plumbing. Tests that only assert exported names or type shapes are insufficient.

Required focused plumbing tests:

- CLI: help flags, zero args, mixed help plus path, clean run, finding run, tool-error run.
- File selection: `.ts`, `.tsx`, `.d.ts`, `.test.ts`, `.spec.ts`, generated line comment, generated block comment, generated marker outside file head.
- Compiler/load: missing path, unreadable path if practical, malformed TypeScript, type-check failure, valid TSX.
- Diagnostics: exact format, line/column, deterministic sorting, rule names.

Required structural proof:

- Positive fixtures cover module import/declaration/behavior order, declaration-zone values, exported arrow-const public roots, non-function const values, direct helper call order, nested helper order, class member sections, accessors, and static members.
- Source inspection confirms invalid structural paths emit diagnostics from the positive grammar walker rather than from denied-example catalogs.
- Source inspection confirms unsupported dispatch forms are ignored by bounded extractor code rather than represented as rejected fixtures.
- The implementation must not add structural unit tests whose input is a malformed order specimen such as helper-before-root, orphan-helper, misplaced section, misplaced class member, or non-adjacent accessor.

## Positive Witness Fixtures

Fixtures are compileable TypeScript or TSX files with generic placeholder identifiers and no inline explanatory comments. They witness accepted structure. They do not demonstrate rejected structure.

Required fixture roots:

- `fixtures/positive/section-order/`
- `fixtures/positive/declaration-zone-order/`
- `fixtures/positive/dfs-public-root/`
- `fixtures/positive/helper-placement/`
- `fixtures/positive/orphan-unexported-helper/`
- `fixtures/positive/accessor-pair/`
- `fixtures/positive/class-member-order/`

At least one fixture under each root must exercise the corresponding accepted grammar. The DFS and class-member roots must include enough examples to prove TypeScript-specific behavior, including arrow-const roots and accessors.

## Verification Contract

Required local gates from repository root:

```sh
npm run build
npm run self-check
npm run fixture-check
npm run ci
rg -n "ts-morph|fixtures/negative|expected\\.txt|violationType|denyList|allowList|waiver|ignore directive|stepdown-ignore|stepdown:ignore" src fixtures docs/specs
```

Expected result:

- All package scripts exit `0`.
- The source sweep finds no live rejected-shape, waiver, or alternate-configuration terms except inside this verification command or explicit non-goal prose.

Reviewers should also inspect file responsibilities manually. A passing command suite does not approve mixed bucket files or a hard-coded rejected-form implementation.

## Release And Recovery

The v0.1.0 release may proceed only after:

- `npm run ci` passes.
- Positive fixtures exist and run clean.
- CLI help and exit-code tests pass.
- The package analyzes its own `src` tree with zero findings.
- README command examples match the implemented CLI.

Rollback is straightforward before npm publication: revert the analyzer implementation and keep the ADR/spec. After publication, fixes must be additive patch releases unless the published behavior violates ADR-0001 and must fail closed.

## Translation Choices

T1. Zero-arg CLI behavior is a v0.1.0 correction.

- Chosen: zero args are a tool error with exit `2`.
- Rejected: zero args print help and exit `0`.
- Rationale: ADR-0001 reserves `0` for clean/help. Running without input is not an analyzer success.

T2. Directory expansion is analyzer-owned.

- Chosen: the CLI accepts files and directories, and source loading expands directories.
- Rejected: require callers to shell-expand files.
- Rationale: ADR invocation examples use paths, and package scripts run against `src` and `fixtures/positive`.

T3. Type-check failures are fatal.

- Chosen: analyzed files must parse and type-check before structure diagnostics are trusted.
- Rejected: analyze malformed or type-broken files best-effort.
- Rationale: ADR-0001 defines `type-check-failure` as an exit `2` condition.

T4. Rule modules remain narrow.

- Chosen: source loading, classification, graph extraction, and rule emission are separated.
- Rejected: a single walker file that parses, classifies, detects every rule, and formats output.
- Rationale: the positive grammar must remain reviewable and self-policing.

## Author Checklist

- [x] Problem, success, scope, exclusions, contracts, failure behavior, buildability, and verification are explicit.
- [x] Section 2.7 guarantee preservation is modeled.
- [x] ADR-0001 rule names and TypeScript-specific semantics are mapped to implementation and tests.
- [x] Current scaffold facts are separated from required v0.1.0 corrections.
- [x] Out-of-scope items block silent expansion.
- [x] Implementation slices are small enough for incremental review.
- [x] Verification commands are executable from repository root.
