# ADR-0001: Stepdown TS Structure Analyzer

Status: Accepted
Date: 2026-05-31
Accepted: 2026-05-31
Decision owner: stepdown maintainer (TypeScript-side)
Initial maintainer: easy team
Owner: Stinnett Holdings LLC
Ratified by: Founder (John Stinnett), with cross-language consistency review by the stepdown-go maintainer (architecture-phase ferry exchange, 2026-05-31)

## Context

`stepdown-ts` is the TypeScript implementation of the stepdown family of structural source analyzers. The family is a small set of pinned external linters, one per language, each enforcing the same one opinion: **source reads top-down — high-level declarations appear before the supporting declarations they depend on, and within a scope a public entry point is immediately followed by its private callees in depth-first call order.**

The language-agnostic constitution governing every member of the family is published at <https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md>. Every rule in this ADR traces back to that constitution; any rule that does not is out of scope for `stepdown-ts` and must wait on a new ADR with explicit justification.

The Go sibling is [`stepdown-dev/stepdown-go`](https://github.com/stepdown-dev/stepdown-go), specified by its own ADR-0001. This ADR mirrors the Go ADR's section structure with TypeScript-specific grammar, classification predicates, fixtures, file selection, and rule vocabulary. The constitution is shared; the implementations are native.

The motivation is the same anti-drift motivation that produced `stepdown` on the Go side: as AI-driven code generation produces more code per unit time, source structure tends to drift across editing sessions because the generator's local context window does not capture global file structure. Over many iterations, files lose top-down readability — callers appear below callees, constructors appear after the methods that depend on them, helpers interleave with public roots. `stepdown-ts` addresses this drift by making the structural rule mechanical: TypeScript source that does not pass `stepdown-ts` fails the local verification gate, before review.

`stepdown-ts` is intentionally narrow. It enforces source-file structure, not semantic correctness, not security, not performance, not API design. It is one rule, expressed as a positive grammar over the TypeScript compiler API's AST. Deviations from the grammar fail. There are no waivers.

This ADR is canonical for `stepdown-ts`'s tool semantics. Consumers that adopt `stepdown-ts` in their own verification pipelines record consumer-side facts (pinned version, invocation command, runtime ceiling, version-drift checks) in their own adoption records, not in this ADR.

## Decision

### Tool identity

- Tool name: `stepdown-ts`
- Binary name: `stepdown-ts` (via npm `bin` declaration in `package.json`)
- npm package: `@stepdown-dev/ts`
- Repository: `github.com/stepdown-dev/stepdown-ts`
- Brand: `stepdown.dev/ts` (docs home; **not** a fetch path)
- License: Apache 2.0
- Owner: Stinnett Holdings LLC

The npm scope `@stepdown-dev` mirrors the GitHub organization for one-brand symmetry (`github.com/stepdown-dev/stepdown-ts` ↔ `npm install @stepdown-dev/ts`). The TypeScript / npm ecosystem resolves packages by package name, not by URL, so `stepdown.dev/ts` is the brand and docs home for the TS member — **not** a vanity import path. This is the deliberate asymmetry with the Go sibling, where `stepdown.dev/go` IS a real Go vanity import path resolved by a `go-import` meta tag served by the family's Cloudflare Worker. Brand symmetry; mechanism diverges.

Repository metadata, npm package name, license headers, brand URL, and similar steward-identifying tokens are explicitly carved out as **locator metadata**, not tool semantics. The tool's **rule vocabulary, diagnostics, fixture content, error messages, and rule documentation** use only TypeScript-language concepts and contain no steward or consumer identity. The same locator-metadata discipline applies as for other commodity TypeScript tools whose packages name their stewards (e.g., `@vue/cli` for Vue, `@nestjs/core` for Nest).

### Maintainer ownership

The initial maintainer is the easy team (the `easy` project's Auditor authored the TS port under the family-steward's frame). The tool is owned by Stinnett Holdings LLC. Maintainer succession is recorded by an amendment to this ADR (changing this section) or by a successor ADR. An orphan maintainer is a recognized failure mode (see Failure Modes); the maintainer's responsibility is to either continue the work or arrange succession before stepping away.

### Public-facing motivation

`stepdown-ts` enforces top-down readability for human review of TypeScript source code. As AI-driven code generation becomes common, source structure tends to drift across editing sessions: declarations accumulate in arbitrary positions because the generator's local context window does not capture global file structure. Over many iterations, files lose top-down readability — exported functions appear below their private callees, classes mix accessors with behavior, helpers float without their public root in sight.

`stepdown-ts` addresses this drift by making the structural rule mechanical. TypeScript code that does not pass `stepdown-ts` fails the local verification gate. The tool does not depend on human review to catch structural drift; it catches drift before review.

### Grammar

`stepdown-ts` enforces a two-layer positive grammar over each non-test, non-generated TypeScript source file in the project's `tsconfig.json` include set.

#### Module-level grammar (the primary layer)

Each module-level section is optional (may be empty) but must appear in this order when present:

```
imports
declaration zone:
  types / interfaces / enums  (fixed sub-order)
  module-level constants      (fixed sub-order)
behavior zone:
  exported classes and exported functions, in source order
    (each public root immediately followed by its private callees
     in depth-first pre-order — DFS-from-public-roots; see DFS bounds below)
unexported helper declarations not reached from any public root
  (these emit `orphan-unexported-helper`)
```

**Conscious divergence from `stepdown-go`** — Go stepdown deliberately does not DFS package-level functions (flat file-end section; DFS lives only inside per-type method blocks). `stepdown-ts` moves DFS to the module level because TypeScript's call-locality spine is the module functions — class-free TypeScript files have nowhere else for it to live. Same principle, different locus. Two same-shape files in Go and TS will order differently as a consequence; this is intentional grammar adaptation to language idiom, not accident.

**Declaration zone fixed order.** Types/interfaces/enums first, then module-level `const`. The order within the zone is fixed; DFS does not apply within the declaration zone. Types come first because TypeScript types are commonly forward-referenced by const annotations and function signatures defined later, and "vocabulary before values" is the convention this captures mechanically.

**Behavior zone source order + DFS.** Exported classes and exported functions appear in source order at the module level. Each is a "public root" for DFS. An exported root is immediately followed in source order by its unexported callees in depth-first pre-order, AST-locally (see DFS bounds).

**Shared-callee ownership.** When a private helper is called by more than one exported root in the same file, ownership is determined by source order of the exported roots:

- Exported roots are traversed in their source order.
- The first exported root whose DFS reaches an unexported helper **owns its placement** — the helper is placed immediately after that root's subtree in DFS pre-order.
- Later exported roots may freely call the already-placed unexported helper without requiring it to be re-placed or duplicated.
- Every unexported helper in the file must be reachable from at least one exported root in the same file. Unreachable cases emit the `orphan-unexported-helper` diagnostic.

#### Class body grammar (the OO sub-layer, present when TypeScript is OO)

When a module contains an exported class, the class body uses this ordering:

```
field declarations           (instance fields, in source order)
constructor                  (singular per class in TypeScript)
public methods               (DFS-to-private; same model as module-level behavior zone)
private methods              (placed inline as DFS reaches them from public callers)
static members               (one block, last, no further classification within)
```

Class-body DFS is independent of module-level DFS — see DFS bounds below. A class method that calls a module-level function does not pull it into the class.

**Accessor pair adjacency.** TypeScript `get` and `set` are real syntactic constructs (unlike Go, which fakes accessors with naming + body conventions). `stepdown-ts` treats `get` and `set` as methods for ordering purposes, with one micro-rule: paired `get` and `set` for the **same property name** stay adjacent. Purely syntactic — `stepdown-ts` does no body-shape analysis to detect accessors. The micro-rule emits the TS-specific `accessor-pair` diagnostic.

**No factory detection.** Detecting "factory-ness" of static methods by return-type-matches-the-class is the `constructor-adapter` classification the Go ADR considered and removed for over-matching. `stepdown-ts` does not repeat this. All static members go in the static block, last, with no further classification within them. This keeps the grammar purely positive and prevents inevitable drift toward "well, just for factory statics..." special-casing.

#### DFS explicit bounds

DFS in `stepdown-ts` is **AST-local**, not whole-program call graph analysis. There are two separate, non-crossing scopes:

- **Module-level DFS** traverses module-level functions only.
- **Class-body DFS** traverses that one class's own methods only.

A class method that calls a module-level function does not pull it into the class; a module-level function that calls a class method does not pull the class method into the module. The scopes do not cross.

**Bounds — in the graph:**

- Same file only — no cross-file analysis
- Same scope only — module vs a single class; never both at once
- Direct, statically-resolvable call edges only:
  - `foo()` where `foo` is a function declared at the module level in this file
  - `this.bar()` where `bar` is a method declared in this class

**Not in the graph:**

- Higher-order / callback edges (a function passed as a value, `arr.map(fn)`, `.then(fn)`)
- Dynamic or type-based dispatch (calls through an interface or abstract type; calls where the target is not one statically-known function)
- Inherited / `super` / polymorphic calls
- Calls on other objects (`other.method()`)
- Cross-module / imported calls
- Calls reached only through a `as`-cast or `<Type>`-cast

**Decorators** ride with their declaration — a decorated class or method orders by the declaration, not the decorator.

TypeScript is far more dynamic than Go, so the "not in the graph" list is the load-bearing half of the bounds: it is exactly what keeps the walker AST-local and reviewable (constitution tenet 7). Without these bounds the DFS quietly tries to become whole-program call-graph analysis and the walker stops being verifiable by reading.

#### Arrow-const classification

Modern TypeScript pervasively uses `export const foo = () => { … }` as the canonical form for exported functions, including React components (`export const MyComponent = () => <jsx/>`). `stepdown-ts` pins this **syntactically**:

- A `const` whose initializer is a **direct arrow-function or function-expression literal** (`const f = () => { … }`, `const f = function () { … }`) is a **function** — a behavior-zone root, DFS-ordered, classified the same as `export function f() { … }`.
- Every other `const` is a **value const** (declaration zone), even if its type is callable (`const f = makeHandler()`, a ternary, a conditional expression, etc.).

The criterion is purely syntactic. `stepdown-ts` does not infer "is this value callable" via type analysis; only a direct function-literal initializer reclassifies the `const`. This keeps the grammar walker AST-local (tenet 7) and keeps `.tsx` (React components) working without special-casing.

### Classification predicates

Each module-level declaration and each class member is classified into exactly one category by mechanical AST predicate. Predicates are exact; AST-level ambiguity defaults mechanically to the most general category. Classification errors are reserved for AST-level failures only (see "Classification errors" below).

**Type / interface / enum:**

- A top-level `type`, `interface`, or `enum` declaration.

**Module-level constant:**

- A top-level `const` declaration whose initializer is **not** a direct arrow-function or function-expression literal (see Arrow-const classification).
- `let` / `var` at module level are treated as value declarations and live with constants (TypeScript convention strongly favors `const` at module level; `let` / `var` are tolerated but rare).

**Exported function (module-level public root):**

- A top-level `function` declaration with the `export` keyword; OR
- A top-level `const` declaration with the `export` keyword whose initializer is a direct arrow-function or function-expression literal.

**Exported class (module-level public root):**

- A top-level `class` declaration with the `export` keyword.

**Unexported helper (function or class):**

- A top-level `function`, `class`, or arrow-const declaration without the `export` keyword.

**Class field:**

- Any class member declaration with no callable form (a property declaration with a type annotation and optional initializer).

**Constructor:**

- A class member named `constructor` (the TypeScript keyword — unambiguous; no naming-convention detection).

**Accessor (get / set):**

- A class member declared with the `get` or `set` keyword. Paired `get` and `set` for the same property name stay adjacent (accessor-pair rule).

**Static member:**

- Any class member with the `static` modifier. All statics live in one block at the end of the class body; `stepdown-ts` does no further classification within the static block.

**Public method:**

- An instance method without the `private` or `#`-private modifier, and without `static`.

**Private method:**

- An instance method with the `private` modifier or the `#`-private name prefix, and without `static`.

### Classification errors

Classification errors are reserved for cases where the analyzer cannot produce a deterministic classification:

- **`parse-failure`** — the file is not valid TypeScript syntax (the TypeScript parser failed).
- **`type-check-failure`** — the TypeScript compiler reports errors that prevent meaningful AST analysis (e.g., missing imports that block scope resolution required for DFS bounds).
- **`tsconfig-load-failure`** — the project's `tsconfig.json` cannot be loaded, located, or parsed.

No other condition is a classification error. Body-shape mismatches and naming-convention edge cases default to the appropriate fallback category. The analyzer does not invent classification errors for cases the grammar can resolve mechanically.

### Examples

All fixtures are positive witnesses: synthetic TypeScript source files that conform to the grammar. Each fixture lives in its own directory under `fixtures/positive/<rule>/`. The test harness loads each fixture, runs the analyzer, and asserts zero diagnostics. There is no rejected-form corpus; the implementation contract is the positive grammar and the positive witness fixtures only.

Fixture file naming convention:

```
fixtures/positive/
  <rule>/
    <case>.ts        (or .tsx for React-component cases)
```

Concrete fixture cases (representative; the complete catalog ships with v0.1.0):

- `fixtures/positive/section-order/single-class.ts` — module with imports, types, consts, one exported class, no helpers.
- `fixtures/positive/section-order/functional-module.ts` — module with imports, types, consts, exported functions, DFS-ordered private helpers (class-free).
- `fixtures/positive/dfs-public-root/nested.ts` — multi-level DFS at module level (`exportedFoo → privateA → privateB`).
- `fixtures/positive/dfs-public-root/class-method-dfs.ts` — multi-level DFS inside a class body (`publicFoo → privateA → privateB`).
- `fixtures/positive/helper-placement/shared-callee.ts` — two exported functions share one unexported helper; the first exported function in source order owns its placement.
- `fixtures/positive/orphan-unexported-helper/conforming.ts` — every unexported helper is reachable from at least one exported root.
- `fixtures/positive/accessor-pair/paired-get-set.ts` — class with paired `get`/`set` for the same property kept adjacent.
- `fixtures/positive/class-member-order/full-class.ts` — fields → constructor → public methods (DFS to private) → statics last.
- `fixtures/positive/declaration-zone-order/types-before-consts.ts` — module with types/interfaces/enums before module-level `const` declarations.
- `fixtures/positive/section-order/react-component.tsx` — `export const MyComponent = () => <jsx/>` correctly classified as an exported function (arrow-const classification).

### File selection

`stepdown-ts` applies to non-test, non-generated TypeScript source files in the project's `tsconfig.json` include set.

**Included file extensions:** `.ts`, `.tsx`.

**Excluded by filename convention:**

- `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` — test files
- `*.d.ts` — declaration files; types-only, no call-locality spine for DFS-from-public-roots to enforce; structural ordering is not meaningful for signature-only files

**Excluded by file-head marker:**

- Files containing `// @generated` or `/* @generated */` in the file head — codegen output.

**Conscious divergence from `stepdown-go`** — Go stepdown uses Go toolchain categories (`go/packages`'s `TestGoFiles`/`XTestGoFiles`, build-tag categorization) and the Go-toolchain-standard `// Code generated … DO NOT EDIT.` marker. TypeScript has no equivalent toolchain-defined categorization for tests or generated files: `.test.ts` / `.spec.ts` are conventions enforced by test runners (vitest, jest, etc.), and there is no canonical TS generated-file marker (codegen tools each pick their own). `stepdown-ts` therefore pins:

- The exclusion filename patterns above as a stepdown-ts-defined convention.
- The two generated-file markers above (`// @generated` and `/* @generated */`) as an explicit short list, not configuration. The list does not grow without an ADR amendment.

This is necessity, not deviation from spirit — the constitution tenet 4 ("No waivers") explicitly carves out test and generated files as "out-of-scope file categories ≠ waivers." TypeScript needs to define those categories itself because the language ecosystem does not.

The canonical file set derives from the project's `tsconfig.json` `include` / `exclude` settings. `stepdown-ts` does not invent its own glob mechanism on top of `tsconfig`.

### No waivers

`stepdown-ts` does not provide inline waiver comments, per-file opt-out comments, or rule-specific exemption mechanisms. The structural skips for test and generated files are not waivers; they are out-of-scope file categories defined above.

If a TypeScript source file produces a `stepdown-ts` finding, the file must change to comply with the grammar. If `stepdown-ts` produces false positives that require waivers to survive in real code, `stepdown-ts`'s grammar is wrong — the grammar changes, not the file. The maintainer accepts the cost of designing a grammar correct enough not to need waivers.

This inherits constitution tenet 4 verbatim in spirit. There is no escape hatch.

### Self-policing

`stepdown-ts`'s own source files (excluding tests, generated files) pass `stepdown-ts`'s own check. `stepdown-ts` eats its own dog food. The repository's CI includes a step that runs `stepdown-ts` against its own `src/`. A release version of `stepdown-ts` that does not pass its own check is not shipped.

This inherits constitution tenet 6.

### Implementation discipline

Two architectural commitments are spec-driving and must not be violated as the analyzer is built. They inherit constitution tenets 2 and 5.

**Positive grammar only.** The analyzer walks input against the positive grammar; mismatches emit the named diagnostic. No `forbiddenPatterns`, `denyList`, `antiPatterns`, or `switch violationType { … }` cascades in analyzer source, test harness, or fixtures. Rule names exist in source as stable diagnostic identifiers, not as a runtime catalog of failure kinds the implementation switches on. The implementation contract is positive grammar plus positive witnesses; there is no rejected-form corpus to drive implementation against. If an implementor wants to verify the walker emits a specific diagnostic for some malformed input, they verify it by reading the walker code, not by adding a fixture file demonstrating the bad shape.

**Sparse fixture-driven tests.** A single test function walks `fixtures/positive/`, runs the analyzer on each fixture file, and asserts zero diagnostics. No `expected.txt`, no programmatic per-case assertions, no test helpers beyond the TypeScript compiler API and the project's test runner, no custom assertion DSL, no test factories, no test-per-method or test-per-branch unit tests against analyzer internals, no test prose. The runner is the verification surface; the fixtures are the verification data. A reader of the test directory should feel like they are reading ARM assembly.

Analyzer-internal unit tests are permitted only for tool/load error plumbing (the `parse-failure`, `type-check-failure`, `tsconfig-load-failure` paths). They may not become structural rejected-form examples — no fixtures or unit tests that demonstrate "here is malformed TypeScript; analyzer must emit diagnostic X."

Coverage gaps are addressed by adding fixtures, not by adding tests against analyzer internals.

**Reviewable walker.** The walker uses the TypeScript compiler API (`typescript` npm package) directly, not a higher-level wrapper (e.g., `ts-morph`). Higher-level wrappers add abstraction layers that hide what is actually being checked; raw compiler API code is more transparent for the kind of review tenet 7 demands. The walker must stay small, readable, and directly inspectable enough that reviewers can verify mismatch paths emit diagnostics by reading the source. If the analyzer ever grows beyond "readable by direct inspection," the test strategy must be revisited by an explicit new ADR decision, not by quietly adding negative fixtures or unit tests against analyzer internals.

### Fixture policy

Fixtures live under `fixtures/positive/<rule>/<case>.ts` (or `.tsx`). Each fixture file is self-contained, compileable TypeScript using generic placeholder identifiers (`Foo`, `Bar`, `Baz`, `Widget`, `Service`, `Config`, or analogous neutral identifiers) with no production-system identity, business-domain vocabulary, or consumer-specific references. Fixtures contain no inline comments describing what they verify; the directory name + case filename are the description. Each fixture is the minimal TypeScript source that demonstrates its case.

`stepdown-ts` does not implement a meta-linter on its own fixtures. Fixture discipline is enforced by maintainer review at PR time.

### Diagnostic format

Diagnostics use the Go-toolchain-family diagnostic format (shared across every stepdown member per the constitution's output contract):

```
file:line:column: <rule-name>: <description>
```

Tool errors drop the path:

```
<rule-name>: <description>
```

Diagnostics are deterministic, machine-readable, editor-compatible (matches the format used by `gofmt`, `go vet`, `staticcheck`, `tsc --pretty false`, and other compiler-family tools), one per line, sorted by path → line → column → rule.

Rule names are stable identifiers:

- `section-order` — module-level section appears out of order (imports / declaration zone / behavior zone).
- `declaration-zone-order` — within the module-level declaration zone, consts appear before types/interfaces/enums.
- `dfs-public-root` — an unexported helper or method appears before its calling public root in source order.
- `helper-placement` — an unexported helper appears outside its DFS-placed position (after the wrong public root, or in the wrong section).
- `orphan-unexported-helper` — an unexported helper is not reached from any public root in the same file.
- `accessor-pair` — `get` and `set` for the same property name are not adjacent.
- `class-member-order` — class body members appear out of order (fields / constructor / public methods (DFS) / private methods / statics last).
- `parse-failure`, `type-check-failure`, `tsconfig-load-failure` — analysis cannot proceed for AST-level reasons.

Some rule names describe the rule positively (`section-order`, `dfs-public-root`, `helper-placement`, `accessor-pair`, `class-member-order`, `declaration-zone-order`); one (`orphan-unexported-helper`) describes the failed condition. Both forms are acceptable for diagnostic vocabulary. The rule name is a stable identifier for human-readable output; the implementation underneath remains positive-grammar driven.

The `dfs-public-root` rule name is shared with `stepdown-go` (the same principle); the scope differs (Go: receiver methods within a per-type block; TS: module-level functions + class-body methods within their respective AST-local scopes). The shared name carries the principle; the per-language ADR pins the scope.

The `orphan-unexported-helper` rule is the TS-renamed analog of Go's `orphan-unexported-method`; renamed because TS helpers are not always class methods.

The TS-new rule names (`accessor-pair`, `class-member-order`, `declaration-zone-order`) have no Go analog; each traces to the one opinion (top-down readability within their respective TS-native syntactic structures).

New rules added through future ADRs introduce new rule names; existing rule names are not renamed without an ADR amendment.

### Exit codes

- `0` — clean (no findings, no errors) or `--help`
- `1` — findings present (at least one source file violated the grammar)
- `2` — tool / load / parse / type-check error (configuration failure, tsconfig load failure, internal parser failure)

Exit code 1 versus exit code 2 distinguishes "the source has structural problems" from "the tool itself cannot proceed." Verification gates fail closed on either non-zero exit code.

This inherits the constitution's output contract.

### Pinning mechanism

`stepdown-ts` supports the standard npm pinned-version invocation:

```
npx @stepdown-dev/ts@<version> <path>...
```

Where `<version>` is a published npm version tag (`0.1.0`, `0.2.0`, etc.) following semver conventions. Consumers may also install locally and invoke via the bin name:

```
npm install --save-dev @stepdown-dev/ts@<version>
pnpm exec stepdown-ts <path>...
```

The pinned invocation form is the family equivalent of `stepdown-go`'s `go run stepdown.dev/go/cmd/stepdown@<version>`. Each language uses its ecosystem's native pinned-version mechanism per the constitution's output contract.

Other distribution forms (vendored binary, container image, package-managed install outside npm) and a stable `stepdown-ts --version` command are **deferred to a future ADR**.

Consumers that operate under their own foundation governance may have additional constraints on pinning, on what consumer-side artifacts may be stored, and on whether analyzer source or fixtures may be vendored into the consumer's source tree. Those constraints are recorded in the consumer's own adoption record, not in this ADR.

### Evolution path

New rules and rule families require a new ADR in this repository's ADR sequence (ADR-0002, ADR-0003, etc.). Each new rule needs explicit justification:

- What structural failure mode the rule catches
- Why review and existing rules are insufficient
- Why the rule cannot be expressed under an existing rule
- What edge cases the rule handles
- What edge cases the rule does NOT handle and why
- How the rule traces to the constitution's one opinion

`stepdown-ts` is intentionally a one-opinion tool: source structure should read top-down. New rules must trace back to that opinion or wait. The maintainer rejects rules that drift toward general-purpose TypeScript style enforcement, semantic correctness, security, performance, or API design — those are out of scope.

Bug fixes, TypeScript compiler-API compatibility updates, diagnostic message improvements, and performance work do not require a new ADR; they are maintainer discretion under semantic-versioning patch releases.

### Removal and deprecation

If `stepdown-ts` is replaced, superseded, or retired from active maintenance, the repository remains available as a read-only archive. New versions are not released. Consumers continue to pin to the last working version or migrate to a successor.

`stepdown-ts`'s own lifecycle is independent from `stepdown-go`'s or any specific consumer's lifecycle. Consumers may stop consuming `stepdown-ts` without affecting the repository status.

If the rule the tool enforces is subsumed by upstream TypeScript tooling (e.g., a future version of the TypeScript compiler or `tsc --lint` implements equivalent enforcement), the maintainer marks `stepdown-ts` as superseded and points consumers to the upstream tool.

## Consequences

### Positive

- Source structure remains top-down readable across edit cycles regardless of who or what authored each edit.
- Mechanical enforcement does not depend on human review for structural correctness; the rule catches drift before reviewers see it.
- The tool is small, fast, and predictable — single positive grammar, no configuration, no plugin model.
- Other TypeScript projects can adopt `stepdown-ts` independently if their maintainers value top-down source structure.
- The tool's vocabulary is purely TypeScript-language; it lifts cleanly across organizations, projects, and codebases.
- Family symmetry — TypeScript developers working in polyglot Go + TS codebases (like the easy project, the original consumer) see the same diagnostic format, the same exit codes, the same pinned-version invocation pattern, and the same constitution. Cross-language CI ingestion is uniform.

### Costs and risks

- Strict structural grammar can produce false positives for legitimate TypeScript idioms the grammar did not anticipate. Recovery: file an issue, propose a grammar adjustment, ship a new release if accepted by the maintainer.
- The tool is opinionated. Projects whose maintainers prefer different source ordering will not benefit from `stepdown-ts` and should not adopt it.
- Rule-set creep: `stepdown-ts` could grow into a general-purpose TypeScript style enforcer if new rules are added without discipline. The evolution path requires explicit ADR authority for new rules to prevent this drift.
- Maintainer dependency: an orphaned `stepdown-ts` is worse than no `stepdown-ts` for consumers depending on it. Maintainer succession is recorded explicitly when the maintainer changes.
- TypeScript's dynamism means the DFS bounds exclude many legitimate call-locality relationships (higher-order, polymorphic, cross-module). `stepdown-ts` accepts this — the bounds preserve walker reviewability (tenet 7) at the cost of some call-locality coverage. Projects that want whole-program call-graph analysis use a different tool.
- The arrow-const classification rule is syntactic only; a programmer who deliberately writes `const f = ((): (() => void) => () => {})()` to obscure functional intent will see `f` classified as a value const, not a function. This is intentional (positive grammar; AST-local; no type inference) but a niche edge case.

### Recovery paths

- **False positive on legitimate idiom:** file an issue with a minimal reproduction; maintainer evaluates whether the grammar needs adjustment or whether the idiom is a legitimate violation. A grammar adjustment ships in a new release.
- **Rule produces too many findings on real code:** maintainer evaluates whether the rule is correctly specified. If the rule itself is wrong, the rule is revised or removed. If the rule is correct and the codebase needs to comply, the codebase is the thing that changes.
- **Tool starts enforcing semantic correctness or domain policy:** revert the rule; route the semantic concern to a different tool. `stepdown-ts` is structural only.
- **Maintainer becomes unavailable:** identify succession; if none available, archive the repository and notify consumers via the README and CHANGELOG.

## Alternatives Considered

### Implement `stepdown` rules as an ESLint plugin

Rejected. ESLint plugins are version-coupled to ESLint releases and to the project's ESLint configuration. A standalone tool has independent versioning and lifecycle, and the constitution's tenet 3 (no configuration) is incompatible with ESLint's per-project rule-toggle model. Consumers who already use ESLint can run `stepdown-ts` in addition to ESLint; the costs of being standalone (one more tool in a consumer's verify chain) are small relative to the costs of being coupled to ESLint's configuration ecosystem.

### Use `ts-morph` instead of the raw TypeScript compiler API

Rejected. `ts-morph` is excellent for refactoring tools (lots of mutation and code generation), but `stepdown-ts` only reads. The higher-level wrapper adds abstraction layers that hide what the analyzer is actually checking; raw compiler API code is more transparent for the review tenet 7 demands. Lower dependency footprint and more reviewable code are the right tradeoffs for a positive-grammar walker.

### Use a configuration file for rule selection or customization

Rejected. `stepdown-ts` is one opinion: source structure should read top-down. Configuration would invite divergent flavors of `stepdown-ts` across consumers, which fragments the rule and the tool. The constitution's tenet 3 rejects configuration. Consumers who want different rules use a different tool.

### Skip DFS-from-public-roots; only enforce section order

Rejected. Section order alone is well-trodden territory and other tools cover it (Prettier, eslint section-order rules). DFS-from-public-roots is what makes `stepdown-ts` distinctive: it enforces top-down call-locality within a file, which is the property that addresses the agentic-drift use case. Without DFS, the tool would be a generic section-order linter and would not earn its keep relative to existing options.

### Add inline waiver / opt-out mechanism (e.g., `// stepdown-disable-next-line`)

Rejected. Waivers are entropy machines. A grammar that needs waivers to survive is a wrong grammar; revise the grammar instead. The constitution's tenet 4 explicitly rejects waivers. The structural file-category skips (test, generated) handle the legitimate "rule does not apply to this file kind" cases. Anything else requires the source to change.

### Mirror Go stepdown's per-type / per-class spine exactly, with module-level functions in a flat file-end section

Rejected. Go stepdown's grammar is shaped by Go's call-locality spine: types with receiver methods are the dominant call-locality unit in idiomatic Go. TypeScript's idiomatic call-locality spine is the module's exported functions (class-free files are common, especially in React/functional TS codebases). Forcing TypeScript files to use a flat file-end function section would erase DFS coverage for the majority of real TypeScript code. The conscious divergence (module-level DFS in TS vs per-type-only DFS in Go) is the right adaptation to TypeScript's idiom.

### Detect "factory-ness" of static methods (treat `static create()` / `static from()` like constructors)

Rejected. The same over-match risk the Go ADR's `constructor-adapter` classification carried — "static methods whose return type matches the class" mechanically catches every utility that returns an instance of the class but isn't a factory. Narrowing the predicate (e.g., name pattern) would conflict with the positive-grammar discipline. All statics go in the static block, last, with no further classification within. Factory statics reading a little late is the lesser cost vs the constant temptation to special-case them.

### Reclassify arrow-consts by type analysis (treat any callable-typed const as a function)

Rejected. Type-based reclassification would require type inference in the walker, which breaks the AST-local commitment of the DFS bounds. The purely syntactic criterion (direct function-literal initializer reclassifies; everything else stays a value const) is the principled cut. The cost (a const initialized by `makeHandler()` lives in the declaration zone even though it's callable) is acceptable; the alternative would slide the walker toward whole-program type analysis.

### Permit `get`/`set` accessors to be split (no adjacency rule)

Rejected. Splitting `get foo()` and `set foo(v)` for the same property name into different positions in the class body is a structural anti-pattern that defeats the readability the accessor pair exists to provide. The `accessor-pair` rule is purely syntactic (same property name → adjacent), which keeps it positive-grammar-clean.

### Implement a meta-linter on `stepdown-ts`'s own fixtures to prevent vocabulary drift

Rejected. A meta-linter that enumerates forbidden vocabulary would itself contain the rejected vocabulary in source — a structural anti-pattern (source-side enforcement that contains the rejected story). Fixture discipline is enforced by maintainer review at PR time, not by automated meta-enforcement. This mirrors the Go ADR's identical rejection.

### Support installed-binary distribution and `stepdown-ts --version`

Deferred. `stepdown-ts` supports only `npx package@version` pinning. Binary distribution (e.g., a single-file executable via `pkg` or `bun build --compile`) adds packaging, signing, and version-contract concerns that warrant their own ADR if consumer need surfaces.

## Source of Truth

This ADR is canonical for:

- `stepdown-ts`'s name, repository location, npm package name, brand, license, and owner
- The public-facing motivation
- The grammar including module-level section order, declaration-zone fixed order, behavior-zone DFS-from-public-roots, shared-callee ownership, orphan rule, class-body member order, accessor-pair adjacency, DFS explicit bounds, and arrow-const classification
- Classification predicates for type/interface/enum, module-level const, exported function, exported class, unexported helper, class field, constructor, accessor, static member, public method, private method
- Classification error definition (parse-failure, type-check-failure, tsconfig-load-failure)
- The positive witness fixtures (per-case file layout under `fixtures/positive/<rule>/`)
- File selection rules and the explicit `// @generated` / `/* @generated */` marker list
- Fixture policy
- Diagnostic format, rule names, and exit codes
- Pinning mechanism (`npx @stepdown-dev/ts@<version>` and local-install equivalent)
- Evolution path for new rules
- Removal and deprecation posture
- Self-policing requirement
- Implementation discipline: positive-grammar-only enforcement, sparse fixture-driven test code, raw TypeScript compiler API (no `ts-morph`)
- Initial maintainer identity and succession discipline

The language-agnostic constitution is sourced from <https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md>. This ADR cites that document; the document itself is the source of truth for the eight tenets.

Consumer-side adoption details (consumer-specific pinned version, invocation command, runtime ceiling, version-drift test) are recorded by each consumer in their own adoption record. `stepdown-ts` does not maintain a registry of adopters.

No other source of truth is permitted for the facts above.

## Failure Modes

| ID | Failure | Meaning | Recovery |
|---|---|---|---|
| `false-positive-on-idiom` | `stepdown-ts` rejects a legitimate TypeScript idiom the grammar did not anticipate | The grammar is wrong, not the source | File an issue with minimal reproduction; maintainer evaluates; grammar adjustment ships in new release. |
| `domain-leakage-in-fixture` | A test fixture contains production-system or business-domain vocabulary | Fixture discipline violated | Replace with synthetic TypeScript-grammar example; review the fixture-review checklist; maintainer adds the check to PR review. |
| `rule-creep` | A new rule is added without ADR authority | Evolution path bypassed | Revert the rule; route through proper ADR authority before re-adding. |
| `self-policing-failure` | `stepdown-ts`'s own source does not pass `stepdown-ts`'s own check | The tool fails its own grammar | Fix the source or fix the grammar; do not ship a version that fails self-check; CI must block release. |
| `orphan-maintainer` | The tool's maintainer becomes unavailable without succession | Tool risk for consumers | Identify successor maintainer; if none, mark repository as archived and notify consumers via README and CHANGELOG. |
| `waiver-pressure` | Consumers or contributors request waiver mechanisms to silence findings | Pressure to weaken the rule | If a class of valid code consistently fails, the grammar is wrong — revise the grammar. If individual files fail and the grammar is correct, the files change. Do not add waivers. |
| `semantic-rule-creep` | A new proposed rule enforces semantic correctness, security, performance, or domain policy rather than source structure | Tool scope exceeded | Reject the rule. `stepdown-ts` is structural only. Route the concern to a different tool. |
| `configuration-creep` | Pressure to add configuration flags, rule toggles, or per-project customization | Tool philosophy violated; tenet 3 violated | Reject. `stepdown-ts` is configuration-free by design. Consumers who want different rules use a different tool. |
| `classification-ambiguity-exploit` | Source uses an edge case the classification predicates do not handle cleanly, producing inconsistent classification | Predicate gap exposed | Add predicate clarification in a new ADR or amendment; update the canonical examples if needed. |
| `negative-enforcement-pattern` | Analyzer implementation uses a denied-list, forbidden-pattern catalog, or failure enumeration instead of positive-grammar walking | Implementation discipline violated; tenet 2 violated | Refactor to positive-grammar walker; remove the negative list; let mismatches against positive grammar emit diagnostics. |
| `test-coverage-creep` | Implementation grows dense per-method or per-branch tests instead of sparse fixture-driven tests | Test discipline violated; tenet 5 violated | Prune unit tests against analyzer internals; rely on the fixture set; add new fixtures for any uncovered grammar cases. |
| `dfs-bounds-creep` | DFS implementation quietly starts following higher-order, polymorphic, cross-module, or type-cast call edges | The "not in the graph" half of DFS bounds violated; walker drifting toward whole-program analysis; tenet 7 reviewability threatened | Revert the bounds violation; if the missing coverage is a real gap, justify in an ADR amendment, not in implementation drift. |
| `arrow-const-type-inference` | Arrow-const classification implementation reaches into type inference to decide if a value const is "really" callable | Syntactic-only discipline violated; AST-local commitment broken | Revert to direct-literal-initializer-only criterion; type-callable values stay in declaration zone. |
| `wrapper-dependency-creep` | Implementation adds `ts-morph` or similar higher-level wrapper to "simplify" the walker | Reviewability commitment violated; abstraction layers obscure mismatch paths from reviewers | Revert; rebuild against raw TypeScript compiler API; if walker complexity is the real problem, refactor the walker, not the dependency stack. |

The first eleven failure modes inherit from `stepdown-go`'s ADR-0001 (constitution-level concerns shared across every family member). The last three (`dfs-bounds-creep`, `arrow-const-type-inference`, `wrapper-dependency-creep`) are TypeScript-specific failure modes the Go side does not face; each addresses a class of drift that would defeat `stepdown-ts`'s ability to remain a reviewable AST-local positive-grammar walker.

## State and Lifecycle

This ADR is Accepted as of 2026-05-31. `stepdown-ts` v0.1.0 may be released against this specification.

Future ADRs in the `stepdown-ts` sequence (ADR-0002, ADR-0003, etc.) amend, supersede, or extend this one. The ADR sequence is internal to this repository; the family Principles document is governed separately at <https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md> and amendments to it are coordinated across all language siblings.

Bug fixes, TypeScript compiler API compatibility updates, diagnostic message improvements, and performance work do not require ADRs; they are maintainer discretion under semantic-versioning patch releases.

This ADR is superseded only by a later ADR in this repository that explicitly cites it.

## Follow-On Artifacts

Expected after this ADR is accepted:

- `stepdown-ts` v0.1.0 implementation release covering the grammar
- Self-policing CI step in this repository running `stepdown-ts` against its own `src/`
- Initial fixture catalog under `fixtures/positive/<rule>/`, one file per positive witness, each fixture asserting zero diagnostics
- Test harness implementing fixture-driven testing per the Implementation discipline section above (sparse, mechanical, no test helpers beyond the TypeScript compiler API and the test runner)
- Repository README pointing at this ADR as the authoritative tool specification
- Repository CONTRIBUTING.md describing the ADR-driven evolution process for new rules
- `imports_test.ts` (or equivalent) allow-list guard locking the "no production provider SDK" constraint — same drift-protection follow-up that the Go side recognized (Designer + Specwright noted this as a non-blocking nit on `stepdown-go` and on the `easy` project's F01 AI Tooling work; `stepdown-ts` adopts the same discipline preemptively)

Consumer-side adoption records are authored independently by each consuming project and are not tracked here.
