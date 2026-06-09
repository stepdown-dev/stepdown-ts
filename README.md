# stepdown-ts

[![Verify](https://github.com/stepdown-dev/stepdown-ts/actions/workflows/verify.yml/badge.svg)](https://github.com/stepdown-dev/stepdown-ts/actions/workflows/verify.yml)
[![License](https://img.shields.io/github/license/stepdown-dev/stepdown-ts)](LICENSE)
[![Node Version](https://img.shields.io/node/v/@stepdown-dev/ts)](package.json)
[![npm](https://img.shields.io/npm/v/@stepdown-dev/ts.svg)](https://www.npmjs.com/package/@stepdown-dev/ts)
[![npm downloads](https://img.shields.io/npm/dm/@stepdown-dev/ts.svg)](https://www.npmjs.com/package/@stepdown-dev/ts)

**A TypeScript linter that keeps source files readable top to bottom.**

Good TypeScript files read like a newspaper: the headline first, the details below. Types and interfaces come before the consts and behavior that use them, exported functions come before the private helpers they call, and you never have to scroll up to understand what you're looking at. `stepdown-ts` enforces that order mechanically, so it stays true no matter how many edits — human or machine — a file goes through.

That last part is the point. Code generators are good at writing correct functions and bad at placing them: a helper lands above the function that calls it, a class drifts below the methods that use it, declarations pile up wherever the cursor happened to be. Each edit is locally fine and the file slowly stops reading top-down. `stepdown-ts` makes the ordering a check instead of a habit.

## Example

This file passes:

```ts
import { strictEqual } from "node:assert";

interface Config {
  readonly value: number;
}

type Result = {
  readonly label: string;
};

const DEFAULT_CONFIG: Config = {
  value: 1,
};

export function buildResult(config: Config = DEFAULT_CONFIG): Result {
  const label = formatLabel(config.value);
  strictEqual(label.length > 0, true);
  return { label };
}

function formatLabel(value: number): string {
  return `value-${value}`;
}
```

Read it straight down: the import, then the types, then the const, then the exported function, with `formatLabel` sitting right below the function that calls it. Move `formatLabel` above `buildResult`, drop the `DEFAULT_CONFIG` constant beneath the function definitions, or wedge a private helper between two exported functions, and `stepdown-ts` reports the file with a `file:line:column` diagnostic and a non-zero exit code.

## Usage

```sh
npx @stepdown-dev/ts@0.1.0 src
```

Drop that into a CI step, or run it after `npm install --save-dev @stepdown-dev/ts@0.1.0` with `npm exec stepdown-ts -- src`. It takes file and directory paths and analyzes the non-test, non-generated TypeScript and TSX files.

Exit codes:

- `0` — clean
- `1` — one or more files do not conform
- `2` — could not analyze (usage, load, parse, type-check, or tool error)

Diagnostics use the standard format, so editors and CI pick them up without configuration:

```
file:line:column: rule-name: description
```

## What it enforces

Each non-test, non-generated TypeScript or TSX file in the project's `tsconfig.json` include set must order its declarations like this:

```
imports
declaration zone:
  types / interfaces / enums
  consts
behavior zone:
  exported functions and classes
    each public root followed by its private callees in depth-first order
unexported helpers (must be reached from a public root)
```

For class bodies:

```
fields
constructor
public methods (each followed by its private `this.X()` callees, depth-first)
private methods (placed inline as DFS reaches them)
static members (one block, last)

paired get/set accessors for the same property name stay adjacent
```

Sections are optional — an empty file with just an import passes. The arrow-const pattern `export const f = () => {}` is classified as an exported function (behavior zone), not a const (declaration zone). TSX is supported without forcing a React dependency.

## What it doesn't do

`stepdown-ts` checks one thing: declaration order. It does not check correctness, security, performance, or API design — TypeScript's compiler, ESLint, Prettier, and other linters already do those, and `stepdown-ts` runs happily alongside them.

It has no configuration file, no rule toggles, and no per-line ignore comments. The order is the order. If a piece of valid TypeScript consistently can't satisfy it, that's a bug in the grammar — [open an issue](https://github.com/stepdown-dev/stepdown-ts/issues), don't reach for a waiver.

## Documentation

The complete specification — every classification rule, the DFS ordering, file selection, and diagnostics — lives in the architecture decision record:

**[ADR-0001: Stepdown TS Structure Analyzer](docs/adr/0001-stepdown-ts-structure-analyzer.md)**

The ADR is canonical for the tool's behavior; this README is the tour. `stepdown-ts` is governed by ADRs under `docs/adr/`, and new rules arrive through new ADRs rather than configuration.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, the verification gate, and the discipline that applies to changes.

## License

[Apache License 2.0](LICENSE).

## Family

`stepdown-ts` is the TypeScript member of the [stepdown family](https://github.com/stepdown-dev) of structural source analyzers — all sharing one [constitution](https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md) (positive grammar, no configuration, no waivers, self-policing). The Go sibling, [`stepdown`](https://github.com/stepdown-dev/stepdown-go), is in production at v0.1.3.
