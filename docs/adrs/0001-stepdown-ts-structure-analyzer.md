# ADR-0001: stepdown-ts Structure Analyzer

Status: Pending — awaiting upstream Principles doc + skeleton frame from `stepdown-dev/stepdown-go`.
Date: 2026-05-31
Maintainer: easy team (TS author)
Owner: Stinnett Holdings LLC

## Context

stepdown-ts is the TypeScript implementation of the **stepdown** family. Per the family constitution (Principles doc forthcoming at `stepdown-dev/.github/PRINCIPLES.md`), every language member inherits the same opinion + constitution while specifying its native grammar in its own ADR-0001.

This ADR is the canonical TypeScript-side grammar specification. It is pending arrival of:

1. The shared **Principles doc** — the 8-tenet constitution + output contract + stewardship — authored by the Go-side steward and stewarded at `stepdown-dev/.github/PRINCIPLES.md`.
2. The **skeleton TS ADR-0001 frame** marking `[INHERIT]` vs `[TS-FILL]` sections, so this ADR fills the TS-specific grammar inside a constitution-compliant frame rather than re-deriving the discipline.

Until both land, this ADR is a placeholder.

## What this ADR will pin (when filled)

The grammar fills below have been converged on with the Go-side steward and are committed; they are listed here so the scaffold is intelligible and the implementation gate is unambiguous. The ADR phrasing will be tightened against the skeleton frame when it lands.

### Tool identity (locator metadata)

- Package: `@stepdown-dev/ts` on npm
- Binary: `stepdown-ts` (via `bin` declaration)
- Repo: `github.com/stepdown-dev/stepdown-ts`
- Brand: `stepdown.dev/ts`
- License: Apache-2.0
- Owner: Stinnett Holdings LLC

### Grammar — two-layer with module-level center of gravity

**Module-level (the primary layer for TS — conscious divergence from Go):**

1. **Imports** — position only; ordering within imports not enforced
2. **Declaration zone (fixed order, no DFS):**
   - a. Types / interfaces / enums
   - b. Constants (module-level `const`)
3. **Behavior zone:**
   - Exported classes and exported functions in source order
   - Each exported root immediately followed by its private callees in depth-first pre-order
   - **Shared-callee ownership:** when a private helper is called by multiple exported roots, the first exported root in source order (that calls it) owns its placement
   - **Orphan rule:** unexported helpers with no public caller are flagged as `orphan-unexported-helper`

**Divergence from Go stated explicitly:** Go stepdown deliberately does not DFS package-level functions (flat file-end section; DFS lives only inside per-type method blocks). stepdown-ts moves DFS to the module level because TS's call-locality spine is the module functions — class-free files have nowhere else for it to live. Same principle, different locus. Two same-shape files in Go and TS will order differently as a consequence; this is intentional grammar adaptation to language idiom, not accident.

### DFS explicit bounds (load-bearing)

DFS is **AST-local**. Two separate, non-crossing scopes: module-level DFS traverses module-level functions only; class-body DFS traverses that one class's own methods only. A class method that calls a module-level function does not pull it into the class.

**In the graph:** direct, statically-resolvable call edges only — `foo()` (a function declared in this file), `this.bar()` where `bar` is declared in this class.

**Not in the graph:** higher-order / callback edges (function passed as a value, `arr.map(fn)`, `.then(fn)`); dynamic or type-based dispatch (calls through an interface/abstract type, or where the target isn't one statically-known function); inherited / `super` / overridden (polymorphic) calls; calls on other objects (`other.method()`); cross-module / imported calls; calls reached only through a cast.

**Decorators** ride with their declaration — a decorated class/method orders by the declaration, not the decorator.

TS is far more dynamic than Go, so the "not in the graph" list is the load-bearing half — it is exactly what keeps the walker AST-local and reviewable (tenet 7).

### Arrow-const classification (load-bearing)

A `const` whose initializer is a **direct arrow-function or function-expression literal** (`const f = () => {…}`, `const f = function () {…}`) is a function — a behavior-zone root, DFS-ordered. Every other `const` is a value const (declaration zone), even if its type is callable (`const f = makeHandler()`, a ternary, etc.).

Purely syntactic — never infer "is this value callable"; only a direct function-literal initializer reclassifies.

This makes `export const Foo = () => <jsx/>` (the canonical modern React/TS component form) a behavior-zone root, which is the correct classification. Keeps `.tsx` working without special-casing.

### Class body grammar

1. **Field declarations** (instance fields)
2. **Constructor** (singular per class in TS)
3. **Public methods** (DFS-to-private; same model as module-level behavior zone)
4. **Private methods** (placed inline as DFS reaches them from public callers)
5. **Static members** (one block, last, no further classification within)

**Accessor handling:** `get` and `set` treated as methods for ordering purposes. Micro-rule: paired `get` and `set` for the **same property name** stay adjacent (purely syntactic — no body-shape analysis). Documented as the `accessor-pair` rule; TS-new, no Go analog.

**No factory detection.** Detecting "factory-ness" by return-type-matches-the-class is the `constructor-adapter` over-match the Go ADR rejected. Not repeated here.

### Classification

- **Exported vs non-exported** (via `export` keyword presence on the declaration)
- **Class vs function** (via `class` keyword vs `function` / arrow-const-as-function per Arrow-const classification above)
- **Constructor** (via `constructor` keyword — unambiguous; no naming-convention detection)
- **Accessor** (via `get` / `set` keywords)
- **Static** (via `static` modifier)

### File selection

- **Included:** `.ts`, `.tsx`
- **Excluded:** `.test.ts` / `.spec.ts` / `.test.tsx` / `.spec.tsx` (test files — out-of-scope category, not a waiver)
- **Excluded:** `*.d.ts` (declaration files — types-only, no call-locality spine for DFS-from-public-roots to enforce; structural ordering not meaningful for signature-only files)
- **Excluded:** files containing `// @generated` or `/* @generated */` in the file head (codegen output — out-of-scope category, parallel to Go's build-tag handling; stepdown-ts-defined convention since TS has no canonical generated-file marker)
- **Canonical file set** derives from `tsconfig.json`'s `include` / `exclude`

### Rule names

Ported from Go: `section-order`, `dfs-public-root` (now applies at module level — divergence noted above), `helper-placement`.

Ported and renamed: `orphan-unexported-method` → `orphan-unexported-helper` (broader because TS helpers aren't always class methods).

TS-new (no Go analog, each traceable to the one opinion):
- `accessor-pair` — `get` / `set` for same property must be adjacent
- `class-member-order` — fields → constructor → methods (DFS) → statics (last)
- `declaration-zone-order` — types/interfaces/enums before consts in the module-level declaration zone

### Output

Text only, one diagnostic per line, sorted: `path:line:column: rule-name: description` (Go-toolchain family format). Tool errors drop the path: `rule-name: description`.

Exit codes: `0` clean (or help), `1` findings, `2` tool / load / parse error.

JSON deferred — would require a coordinated ADR amendment across every family member to prevent fragmentation.

### Pinning

`npx @stepdown-dev/ts@x.y.z <package-pattern>` or, post-install, `pnpm exec stepdown-ts <package-pattern>`. Gates fail closed on any non-zero exit.

## Inherited constitution (from Principles doc, forthcoming)

Eight tenets, binding without renegotiation:

1. One opinion, structural only
2. Positive grammar only
3. No configuration
4. No waivers (out-of-scope file categories ≠ waivers)
5. Positive witnesses only
6. Self-policing — stepdown-ts passes its own check in its own CI
7. Reviewable walker
8. ADR-driven evolution

## Status

Implementation work (the rule modules in `src/rules/`) is gated on this ADR being filled against the upstream skeleton and ratified per tenet 8. The package scaffold exists; the walker is a no-op stub; rule modules are placeholder constants; positive-witness fixture directories exist but are empty.

Filling this ADR + implementing the rules + producing the positive-witness fixtures is the v0.1.0 milestone for `@stepdown-dev/ts`.
