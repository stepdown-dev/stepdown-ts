import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { runStepdown } from "../dist/walker.js";

test("source selection admits TypeScript and TSX while skipping out-of-scope files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "stepdown-selection-"));
  try {
    await writeFile(path.join(root, "accepted.ts"), "export function value(): number {\n  return 1;\n}\n");
    await writeFile(path.join(root, "view.tsx"), "export const View = () => <div />;\n");
    await writeFile(path.join(root, "types.d.ts"), "export function broken(\n");
    await writeFile(path.join(root, "unit.test.ts"), "export function broken(\n");
    await writeFile(path.join(root, "example.spec.tsx"), "export function broken(\n");
    await writeFile(path.join(root, "generated-line.ts"), "// @generated\nexport function broken(\n");
    await writeFile(path.join(root, "generated-block.ts"), "/* @generated */\nexport function broken(\n");

    const result = await runStepdown({ paths: [root] });

    assert.equal(result.toolError, null);
    assert.deepEqual(result.diagnostics, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generated marker outside the file head does not exclude the file", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "stepdown-generated-"));
  try {
    const sourcePath = path.join(root, "late-generated.ts");
    await writeFile(sourcePath, `${" ".repeat(2050)}// @generated\nexport const value: number = "text";\n`);

    const result = await runStepdown({ paths: [sourcePath] });

    assert.equal(result.toolError?.code, "type-check-failure");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("malformed TypeScript is a parse failure", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "stepdown-parse-"));
  try {
    const sourcePath = path.join(root, "broken.ts");
    await writeFile(sourcePath, "export function broken(\n");

    const result = await runStepdown({ paths: [sourcePath] });

    assert.equal(result.toolError?.code, "parse-failure");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("type-broken TypeScript is a type-check failure", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "stepdown-type-"));
  try {
    const sourcePath = path.join(root, "broken.ts");
    await writeFile(sourcePath, 'export const value: number = "text";\n');

    const result = await runStepdown({ paths: [sourcePath] });

    assert.equal(result.toolError?.code, "type-check-failure");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("valid TSX is analyzed without a React dependency", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "stepdown-tsx-"));
  try {
    const sourcePath = path.join(root, "view.tsx");
    await writeFile(sourcePath, "export const View = () => <div />;\n");

    const result = await runStepdown({ paths: [sourcePath] });

    assert.equal(result.toolError, null);
    assert.deepEqual(result.diagnostics, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unreadable directories return a coded tool error", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "stepdown-unreadable-"));
  const closed = path.join(root, "closed");
  await mkdir(closed);
  await chmod(closed, 0);
  try {
    const result = await runStepdown({ paths: [closed] });

    assert.equal(result.toolError?.code, "path-unreadable");
  } finally {
    await chmod(closed, 0o700);
    await rm(root, { recursive: true, force: true });
  }
});
