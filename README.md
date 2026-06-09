# stepdown-ts

TypeScript implementation of **stepdown**, a structural source analyzer for top-down readability.

`stepdown-ts` v0.1.0 implements the grammar accepted in
[ADR-0001](docs/adr/0001-stepdown-ts-structure-analyzer.md).

## Family

- Brand: [stepdown.dev](https://stepdown.dev) -> [stepdown.dev/ts](https://stepdown.dev/ts)
- Principles: [stepdown-dev Principles](https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md)
- Go sibling: [stepdown-dev/stepdown-go](https://github.com/stepdown-dev/stepdown-go)
- Specification: [ADR-0001](docs/adr/0001-stepdown-ts-structure-analyzer.md)
- Owner: Stinnett Holdings LLC

## What It Checks

Source should read top-down: high-level declarations appear before the supporting declarations
they depend on, and public roots are followed by their private callees in depth-first order.

`stepdown-ts` checks TypeScript and TSX source structure only. It does not check formatting,
style, runtime behavior, security, performance, semantic correctness, or API design.

The analyzer is a positive-grammar walker over the TypeScript compiler API. It has no project
configuration, no local suppressions, and no rule toggles. Accepted TypeScript shapes change
through ADR review when the grammar needs to expand.

## Install

```sh
npm install --save-dev @stepdown-dev/ts@<version>
```

## Invoke

```sh
npx @stepdown-dev/ts@<version> <path> [<path>...]
```

Or, after pinned local install:

```sh
npm exec stepdown-ts <path> [<path>...]
```

Help:

```sh
stepdown-ts -h
stepdown-ts --help
stepdown-ts -help
```

## Output

Diagnostics are sorted text lines:

```text
path:line:column: rule-name: description
```

Exit codes:

- `0` - clean input or help
- `1` - structural findings
- `2` - tool, load, parse, or type-check error

Verification gates fail closed on any non-zero exit code.

## Rule Set

- `section-order` - module-level section out of order
- `declaration-zone-order` - declaration-zone types, interfaces, and enums appear after values
- `dfs-public-root` - helper appears before the public root that first reaches it
- `helper-placement` - helper appears outside the public root's depth-first helper order
- `orphan-unexported-helper` - helper is not reached from a same-file public root
- `accessor-pair` - paired `get` and `set` accessors are not adjacent
- `class-member-order` - class members appear outside fields, constructor, behavior, statics order

ADR-0001 is the canonical grammar reference.

## Local Verification

Canonical repository gate:

```sh
npm run ci
```

That gate builds TypeScript, runs the test suite, runs `stepdown-ts` against `src`, and checks
the positive witness fixtures under `fixtures/positive`.

Release dry-run:

```sh
npm run release:check
```

The release check runs the canonical gate and `npm pack --dry-run` so package contents include
the executable wrapper, built output, README, and license before publication.

## Reporting Grammar Gaps

Use the GitHub issue forms for:

- valid TypeScript or TSX structure rejected by the analyzer
- ADR-0001-invalid structure accepted by the analyzer
- future structural rule proposals

Reports should include compileable source, exact diagnostics or missing diagnostics, and the
ADR expectation. General style preferences belong outside this tool.

## License

Apache-2.0 - 2026 Stinnett Holdings LLC.
