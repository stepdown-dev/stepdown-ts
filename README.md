# stepdown-ts

TypeScript implementation of **stepdown** — a family of structural source analyzers enforcing top-down readability.

> **Status: pre-release.** The walker is scaffold-only. Rule implementation is gated on ADR-0001 ratification (pending upstream Principles doc + skeleton frame from the family steward).

## Family

- Brand: [stepdown.dev](https://stepdown.dev)
- Go sibling: [stepdown-dev/stepdown-go](https://github.com/stepdown-dev/stepdown-go)
- Constitution: [stepdown-dev/.github → PRINCIPLES.md](https://github.com/stepdown-dev/.github) (forthcoming)
- Owner: Stinnett Holdings LLC

## What stepdown enforces

Source reads top-down: high-level declarations appear before the supporting declarations they depend on, and within a scope a public entry point is immediately followed by its private callees in depth-first call order. stepdown enforces **structure** — never semantics, style, security, performance, or API design.

## Install

```sh
pnpm add -D @stepdown-dev/ts
```

## Invoke

```sh
npx stepdown-ts <path> [<path>...]
```

## Output

`path:line:column: rule-name: description`, one diagnostic per line, sorted, text only.

Exit codes:

- `0` — clean (or help)
- `1` — findings
- `2` — tool / load / parse error

## License

Apache-2.0 — © 2026 Stinnett Holdings LLC.
