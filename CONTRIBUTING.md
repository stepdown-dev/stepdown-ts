# Contributing to stepdown-ts

`stepdown-ts` is governed by the language-agnostic stepdown Principles and ADRs under
`docs/adrs/`. Before contributing, read the canonical sources:

- **stepdown Principles:** <https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md>
- **[ADR-0001: Stepdown TS Structure Analyzer](docs/adrs/0001-stepdown-ts-structure-analyzer.md)**

## ADR-driven evolution

The grammar `stepdown-ts` enforces is described entirely in ADRs. The rule:

- **Bug fixes, TypeScript compiler API compatibility updates, diagnostic message
  improvements, and performance work** do not require new ADRs. They are maintainer
  discretion under semantic-versioning patch releases.
- **Anything that changes what `stepdown-ts` accepts or rejects as conforming
  TypeScript source** requires a new ADR in this repository's `docs/adrs/` sequence
  that explicitly cites the ADR it amends or supersedes.

New rules must trace back to stepdown's one opinion: source structure should read
top-down. New rules need explicit justification: what structural failure mode the rule
catches, why review and existing rules are insufficient, why the rule cannot be
expressed under an existing rule, what edge cases it handles, and what edge cases it
does not handle.

The maintainer rejects rules that drift toward general-purpose TypeScript style
enforcement, semantic correctness, security, performance, or API design. Those are out
of scope for analyzer grammar.

## Reporting issues

**`stepdown-ts` rejects a legitimate TypeScript idiom the grammar did not anticipate:**
file an issue with a minimal reproduction, the TypeScript version, the Node.js version,
the invocation command, and the diagnostic output.

**`stepdown-ts` accepts a structural shape that should fail:** file an issue with a
minimal example and the expected structural reason it should be rejected by the
grammar.

**`stepdown-ts` is too slow on real code:** file an issue with profiling data, project
size, Node.js version, TypeScript version, and the exact command used.

**`stepdown-ts` cannot load or parse a project:** file an issue with the relevant
`tsconfig.json`, command, package-manager version, and emitted `parse-failure`,
`type-check-failure`, or `tsconfig-load-failure` diagnostic.

Security vulnerabilities should be reported privately through the process in
[SECURITY.md](SECURITY.md), not through public issues.

## Pull request requirements

- **Reviewability.** Changes that touch analyzer enforcement logic must keep the walker
  small enough to verify by direct inspection. ADR-0001's implementation discipline
  depends on this; if a change makes the walker too large to read and verify, the test
  strategy must be revisited in a new ADR before merge.
- **Raw TypeScript compiler API.** Analyzer code uses the `typescript` compiler API
  directly. Higher-level AST wrappers such as `ts-morph` require ADR authority before
  they can enter the implementation.
- **Positive grammar.** Analyzer changes must walk the accepted grammar and report
  mismatches. Do not add denied-list catalogs, forbidden-pattern scans, or
  violation-type switches.
- **Self-policing.** The repository's CI step that runs `stepdown-ts` against its own
  `src/` directory must pass before merge. A release that does not pass its own check
  is not shipped.
- **Local verification.** Run `npm install` once in a fresh checkout, then run
  `npm run ci` before submitting analyzer changes. The CI script runs `npm run build`,
  `npm run self-check`, and `npm run fixture-check`.
- **No waivers.** PRs that introduce inline waiver comments, per-file opt-out
  mechanisms, configuration flags, or rule toggles to silence findings are rejected.
  If a class of valid source consistently fails, propose a grammar adjustment through
  ADR evolution.
- **Fixtures.** Fixture additions follow ADR-0001 fixture policy: self-contained
  TypeScript using generic placeholder identifiers such as `Foo`, `Bar`, `Baz`,
  `Widget`, `Service`, or `Config`; no production-system identity, business-domain
  vocabulary, consumer-specific references, or inline comments describing what the
  fixture verifies.
- **No negative fixtures.** `fixtures/positive/` contains only positive witnesses.
  There is no rejected-form corpus and no `expected.txt` mechanism.
- **Dependency restraint.** Runtime dependency changes must preserve the reviewable
  walker. New dependencies that affect parsing, AST traversal, diagnostics, packaging,
  or invocation behavior require explicit maintainer review and may require ADR
  authority.

## Local development

Use Node.js 20 or newer.

```sh
npm install
npm run ci
```

The package scripts are:

- `npm run build` - run `tsc`.
- `npm run self-check` - run `node bin/cli.mjs src`.
- `npm run fixture-check` - run `node bin/cli.mjs fixtures/positive`.
- `npm run ci` - run build, self-check, and fixture-check in order.

## Licensing

Contributions are licensed under the Apache License 2.0. See [LICENSE](LICENSE).

By submitting a contribution, you certify that you have the right to license it under
Apache 2.0 and that you intend to do so.
