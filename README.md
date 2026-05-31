# stepdown-ts

TypeScript implementation of **stepdown** — a family of structural source analyzers enforcing top-down readability.

> **Status: pre-release.** ADR-0001 is Accepted; rule implementation is the next milestone (v0.1.0).

## Family

- Brand: [stepdown.dev](https://stepdown.dev) → [stepdown.dev/ts](https://stepdown.dev/ts) (this package)
- Constitution: **[PRINCIPLES.md](https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md)** — language-agnostic, binding on every member
- Go sibling: [stepdown-dev/stepdown-go](https://github.com/stepdown-dev/stepdown-go)
- Tool specification: [`docs/adrs/0001-stepdown-ts-structure-analyzer.md`](docs/adrs/0001-stepdown-ts-structure-analyzer.md)
- Owner: Stinnett Holdings LLC

## What stepdown enforces

Source reads top-down: high-level declarations appear before the supporting declarations they depend on, and within a scope a public entry point is immediately followed by its private callees in depth-first call order. stepdown enforces **structure** — never semantics, style, security, performance, or API design.

`stepdown-ts` is a positive-grammar walker over the TypeScript compiler API. There is no configuration, no waivers, and no escape hatch. If valid code consistently fails, the grammar is wrong and changes; source never gets a waiver.

## Install

```sh
pnpm add -D @stepdown-dev/ts
```

## Invoke

```sh
npx @stepdown-dev/ts@<version> <path> [<path>...]
```

Or, after local install:

```sh
pnpm exec stepdown-ts <path> [<path>...]
```

## Output

`path:line:column: rule-name: description`, one diagnostic per line, sorted, text only.

Exit codes:

- `0` — clean (or `--help`)
- `1` — findings
- `2` — tool / load / parse / type-check error

Verification gates fail closed on any non-zero exit code.

## Rule set (v0.1.0 target)

- `section-order` — module-level section out of order (imports / declaration zone / behavior zone)
- `declaration-zone-order` — consts before types/interfaces/enums in the module-level declaration zone
- `dfs-public-root` — unexported helper or method appears before its calling public root
- `helper-placement` — unexported helper outside its DFS-placed position
- `orphan-unexported-helper` — unexported helper not reached from any public root in the same file
- `accessor-pair` — `get` and `set` for the same property not adjacent
- `class-member-order` — class body members out of order (fields / constructor / public methods (DFS) / private methods / statics last)

See [ADR-0001](docs/adrs/0001-stepdown-ts-structure-analyzer.md) for the canonical grammar specification.

## License

Apache-2.0 — © 2026 Stinnett Holdings LLC.
