# Repository Hardening v0.1.0 Spec

Status: Draft for v0.1.0 implementation
Date: 2026-06-09
Authority: [ADR-0001](../adrs/0001-stepdown-ts-structure-analyzer.md)
Target release: v0.1.0

## Problem And Success

The repository has an accepted TypeScript analyzer ADR, an implemented v0.1.0 analyzer, deterministic npm install state, and a verification workflow. Repository hardening must keep local verification, CI verification, public project surfaces, dependency discipline, and release checks explicit enough that analyzer changes cannot bypass the stepdown-dev Principles contract.

Success means:

- One local command, `npm run ci`, remains the canonical repository gate.
- CI delegates to the same package scripts used locally.
- The repository uses a lockfile and deterministic install path for CI.
- CLI help, exit codes, and package metadata are checked before release.
- Public issue and pull request templates steer reports toward structural grammar, not style or rejected-shape catalogs.
- Root public-policy files are verified if already created by the repository hygiene pass, but this spec does not edit them.
- No hardening work changes analyzer semantics without ADR-0001 or a later ADR.

Failure looks like a CI-only command that maintainers cannot reproduce locally, a release path that publishes unbuilt source, a contribution flow that invites waivers/config requests as normal fixes, or repository files that imply the analyzer checks style, security, runtime behavior, or API quality.

## Section 2.7 Guarantee Preservation Table

| Source guarantee | Repository preservation requirement | Verification surface |
| --- | --- | --- |
| Structural-only analysis | README, issue templates, pull request template, release notes, and CLI help describe source structure only. They do not market the package as a style, security, formatting, runtime, or API checker. | Text review and release checklist. |
| Positive grammar only | Repository hardening keeps positive witness fixtures and reviewable grammar tests as the approved evidence path. It does not add negative fixture roots or expected-output catalogs. | `fixtures` sweep and CI. |
| No configuration and no waivers | Contribution and issue templates explain that accepted TypeScript idioms change the grammar through ADR review, not through local ignores or per-project settings. | Template review and source sweep. |
| Self-policing | CI and local `npm run ci` run build, analyzer self-check, and positive fixture check. | Package scripts and workflow review. |
| TypeScript-native implementation | CI installs Node and npm dependencies, builds the TypeScript package, and exercises TS/TSX fixtures. It does not import another language's verifier as a release gate. | Workflow review. |
| Reviewable release | Package contents are checked before publication so `bin`, `dist`, `README.md`, and `LICENSE` are included. | `npm pack --dry-run`. |
| Public reporting stays bounded | Issue forms separate false positive, false negative, and new-rule requests without accepting waiver/config requests as normal resolution. | Issue-template review. |
| ADR-driven evolution | Repository docs point to ADR-0001 as the v0.1.0 authority and require new ADR coverage for new rule families or behavior classes. | Docs and PR-template review. |

## Grounding And Authority

Authoritative sources:

- stepdown-dev Principles document at `https://github.com/stepdown-dev/.github/blob/main/PRINCIPLES.md`.
- ADR-0001 in this repository.
- Current repository files: `package.json`, `.github/workflows/verify.yml`, `README.md`, and `src/`.
- The sibling repository hardening structure, adapted to npm, TypeScript, and ADR-0001.

Current-code facts:

- `package.json` has `npm run build`, `npm run self-check`, `npm run fixture-check`, and `npm run ci`.
- `.github/workflows/verify.yml` runs on pull requests and pushes to `main`, uses Node 20 with npm cache, installs with `npm ci`, and runs `npm run ci` as the canonical repository gate.
- `package-lock.json` exists and pins the npm dependency graph for the v0.1.0 package.
- Root public-policy files are intentionally assigned to a separate repository hygiene pass and are not edited by this spec.

## Scope And Exclusions

In scope:

- Package-script verification contract.
- GitHub Actions CI workflow contract.
- Lockfile and deterministic CI install requirement.
- Package publish dry-run check.
- CLI help and exit-code verification.
- Issue and pull request template requirements.
- Dependency-update configuration for npm dependencies.
- Release checklist and rollback expectations.
- Verification of root public-policy files if they already exist.

Out of scope:

- Implementing analyzer rule behavior.
- Editing `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, or `SECURITY.md` in this pass.
- Adding lint or formatting tools unrelated to ADR-0001.
- Adding config, waiver, ignore, or rule-toggle systems.
- Adding non-npm package-manager commitments.
- Publication automation with npm tokens.
- Website or brand-page work.
- External service integrations beyond GitHub repository maintenance files.

## Options Considered

### Option A: CI Calls Individual Steps Directly

CI can run `npm run build`, `npm run self-check`, and `npm run fixture-check` as separate workflow steps.

Value:

- Step output is readable.

Cost:

- Local and CI gates can drift when scripts change.

Decision:

- Retain readable CI step names, but make `npm run ci` the canonical command and require CI to call it.

### Option B: Add A Shell Verification Script

A shell script can wrap build, self-check, fixture-check, pack dry-run, and text sweeps.

Value:

- A script can host complex checks.

Cost:

- The package already exposes npm scripts, and adding a shell layer increases cross-platform friction for a TypeScript package.

Decision:

- Use npm scripts for v0.1.0. Add a shell wrapper only if future checks exceed readable package-script form.

### Option C: Add ESLint Or Formatter Gates Now

Value:

- Familiar JavaScript repository hygiene.

Cost:

- It widens v0.1.0 beyond the structural analyzer contract and creates a second rule system beside ADR-0001.

Decision:

- Defer. TypeScript build plus analyzer self-check is the v0.1.0 correctness gate.

## Recommended Approach

Repository hardening v0.1.0 should make the existing npm-script path stricter rather than introduce a parallel system:

1. Add or preserve `package-lock.json`.
2. Make CI use `npm ci`.
3. Make CI call `npm run ci`.
4. Add a release verification script or documented command sequence that includes `npm pack --dry-run`.
5. Add issue and pull request templates that route reports through ADR-0001 language.
6. Add npm dependency-update configuration.
7. Verify root public-policy files created by the repository hygiene pass without rewriting them here.

## Boundary And Ownership Model

Expected repository files:

- `package.json`: package scripts, package metadata, binary, files whitelist, Node engine.
- `package-lock.json`: deterministic npm install input.
- `.github/workflows/verify.yml`: pull request and main-branch verification.
- `.github/dependabot.yml`: npm dependency update checks.
- `.github/ISSUE_TEMPLATE/legitimate-idiom-rejected.yml`: reports valid TypeScript structure rejected by the analyzer.
- `.github/ISSUE_TEMPLATE/invalid-structure-accepted.yml`: reports source shape accepted when ADR-0001 says it should not be.
- `.github/ISSUE_TEMPLATE/new-rule-proposal.yml`: proposes later ADR work.
- `.github/PULL_REQUEST_TEMPLATE.md`: keeps changes tied to ADR-0001, tests, fixtures, and verification commands.
- `README.md`: public usage, Principles link, ADR link, install and invoke commands, output and exit codes.
- `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`: root public-policy files verified here only if already created by the repository hygiene pass.

Do not place repository-hardening policy inside `src/`. Source files stay focused on analyzer behavior.

## Contracts And Invariants

### Local Gate

Canonical local command:

```sh
npm run ci
```

The command must run:

1. TypeScript build.
2. Analyzer self-check on `src`.
3. Positive fixture check on `fixtures/positive`.

It may call smaller package scripts. It must fail on the first failed subcommand through normal npm script behavior.

### CI Gate

Workflow requirements:

- Runs on pull requests.
- Runs on pushes to `main`.
- Uses Node 20 or later.
- Installs with `npm ci`.
- Runs `npm run ci`.
- Does not use `npm install` fallback once a lockfile is committed.
- Does not skip self-check or fixture-check.

The workflow can keep separate named steps for readability only if the canonical `npm run ci` remains the executed gate.

### Release Verification

Required pre-release commands:

```sh
npm run ci
npm pack --dry-run
```

`npm pack --dry-run` must show publishable contents that include:

- `bin/`
- built `dist/`
- `README.md`
- `LICENSE`

It must not rely on source-only publication unless package metadata is intentionally changed in a later spec.

### CLI Help Contract

Help output must communicate:

- `stepdown-ts <path> [<path>...]`
- `stepdown-ts -h`
- `stepdown-ts --help`
- `stepdown-ts -help`
- Structural TypeScript analyzer purpose.
- Link to ADR-0001 or README.
- Exit-code summary.

Help exits `0`. Zero args and mixed help/path inputs are errors and exit `2`.

### Template Contract

Issue templates must not ask users to submit config, waivers, suppressions, or style preferences as normal fixes.

Templates should collect:

- TypeScript version.
- Package version.
- Node version.
- Minimal TypeScript or TSX source.
- Actual diagnostics.
- Expected ADR-0001 outcome.
- Whether source is compileable.

Pull request template should require:

- ADR section touched.
- Rule names touched.
- Tests or fixtures added.
- Commands run.
- Statement that no config, waiver, or rejected-shape fixture path was introduced.

### Dependency-Update Contract

Dependency update configuration:

- Uses `npm` ecosystem.
- Covers repository root.
- Runs at least weekly.
- Groups related TypeScript/package maintenance updates where supported.
- Does not auto-merge.

## Risks And Failure Modes

- CI/local drift: avoid by making CI execute `npm run ci`.
- Non-deterministic installs: avoid by committing a lockfile and removing `npm install` fallback.
- Public reports become style debates: avoid by issue templates that anchor reports to ADR-0001.
- Release omits built output: avoid with `npm pack --dry-run`.
- Hardening adds a second rule system: avoid new lint/formatter gates unless later accepted.
- Security policy claims a private channel that does not exist: verify root public-policy file values created by the hygiene pass rather than inventing them here.

## Delivery Plan

1. Lockfile and install determinism
   - Commit `package-lock.json`.
   - Update CI install to `npm ci`.
   - Acceptance: CI no longer uses `npm install` fallback.

2. Canonical local gate
   - Keep `npm run ci` as the one documented local gate.
   - Make CI call `npm run ci`.
   - Acceptance: workflow and README agree.

3. Release dry-run path
   - Add a package script if helpful, such as `pack:check`, or document `npm pack --dry-run` in release checklist.
   - Acceptance: dry run reports intended package files.

4. Public templates
   - Add issue templates for rejected valid idiom, accepted invalid structure, and new-rule proposal.
   - Add pull request template.
   - Acceptance: templates collect ADR-linked evidence and reject waiver/config framing.

5. Dependency-update configuration
   - Add `.github/dependabot.yml` for npm.
   - Acceptance: configuration names npm ecosystem and repository root.

6. Public-policy verification
   - Verify root policy files from the repository hygiene pass exist and do not contradict ADR-0001.
   - Acceptance: hardening pass reports any missing file as a repository hygiene follow-up, not as analyzer implementation work.

## Acceptance Criteria Per Unit

Lockfile and CI:

- `package-lock.json` exists.
- `.github/workflows/verify.yml` uses `npm ci`.
- `.github/workflows/verify.yml` runs `npm run ci`.
- Workflow no longer contains `npm ci || npm install`.

Package scripts:

- `npm run build` compiles TypeScript.
- `npm run self-check` runs `stepdown-ts` against `src`.
- `npm run fixture-check` runs `stepdown-ts` against `fixtures/positive`.
- `npm run ci` runs all three.

Release:

- `npm pack --dry-run` succeeds after `npm run build`.
- Package contents include the executable wrapper, built output, README, and license.

Templates:

- False-positive report template asks for compileable TypeScript/TSX source and actual diagnostic output.
- False-negative report template asks for compileable TypeScript/TSX source and ADR-0001 rule expectation.
- New-rule proposal template asks for structural rule rationale and ADR impact.
- Pull request template asks for commands run and confirms no waiver/config path.

Public-policy verification:

- If root policy files exist, they do not claim analyzer checks beyond ADR-0001.
- If root policy files are absent when hardening implementation runs, the hardening report lists that as blocked on the repository hygiene pass.

## Verification Plan

Required commands from repository root:

```sh
npm run build
npm run self-check
npm run fixture-check
npm run ci
npm pack --dry-run
rg -n "npm ci \\|\\| npm install" .github package.json
rg -n "fixtures/negative|expected\\.txt|violationType|denyList|allowList|waiver|stepdown-ignore|stepdown:ignore" .github docs fixtures src package.json README.md
```

Expected result:

- Package scripts and pack dry-run exit `0`.
- The `npm ci || npm install` sweep returns no matches.
- The rejected-shape and waiver/config sweep returns no live implementation or template paths except explicit non-goal wording in specs.

## Release And Recovery

Release is allowed only after:

- `npm run ci` passes locally and in CI.
- `npm pack --dry-run` reports intended contents.
- Issue and pull request templates are merged.
- Dependency-update configuration is merged.
- Root public-policy files are verified or the missing-file state is recorded as external to this spec's implementation.

Recovery:

- CI breakage from workflow hardening reverts by returning to the prior workflow while preserving the lockfile investigation.
- Template wording issues revert independently from analyzer code.
- Dependency-update configuration can be disabled without changing analyzer behavior.
- Published package mistakes require a patch release; npm publication should not be deleted as a normal recovery path.

## Translation Choices

T1. npm scripts are the v0.1.0 verification surface.

- Chosen: use `npm run ci` as canonical local and CI gate.
- Rejected: add a shell verification script now.
- Rationale: package scripts are native to this TypeScript package and already exist.

T2. `npm ci` is mandatory once a lockfile exists.

- Chosen: deterministic install in CI.
- Rejected: `npm ci || npm install` fallback.
- Rationale: fallback hides lockfile drift and makes CI less reproducible.

T3. Public templates route through ADR language.

- Chosen: collect TypeScript source, diagnostics, and ADR expectation.
- Rejected: generic bug forms that invite style or personal-preference reports.
- Rationale: repository intake must protect the structural-only contract.

T4. Public-policy files are verified, not authored, by this spec pass.

- Chosen: this spec defines hardening requirements and verifies those files when they exist.
- Rejected: duplicate the separate repository hygiene work here.
- Rationale: the root policy files are already assigned to another pass; this spec must not create conflicting content.

## Author Checklist

- [x] Problem, success, scope, exclusions, contracts, risks, delivery, verification, and recovery are explicit.
- [x] Section 2.7 guarantee preservation is modeled.
- [x] Current repository facts are separated from v0.1.0 requirements.
- [x] TypeScript/npm boundaries replace sibling-repository command assumptions.
- [x] Root policy files are not edited by this spec pass.
- [x] Verification commands are executable from repository root.
