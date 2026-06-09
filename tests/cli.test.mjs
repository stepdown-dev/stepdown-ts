import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { runCli } from "../dist/cli.js";

test("help flags print usage and exit clean", async () => {
  const output = captureOutput();

  const code = await runCli(["--help"], output);

  assert.equal(code, 0);
  assert.match(output.stdoutText(), /^Usage: stepdown-ts <path> \[<path>\.\.\.\]/);
  assert.equal(output.stderrText(), "");
});

test("zero args are a tool error", async () => {
  const output = captureOutput();

  const code = await runCli([], output);

  assert.equal(code, 2);
  assert.equal(output.stdoutText(), "");
  assert.match(output.stderrText(), /^tool-error: input path required/);
});

test("help cannot be mixed with input paths", async () => {
  const output = captureOutput();

  const code = await runCli(["src", "--help"], output);

  assert.equal(code, 2);
  assert.equal(output.stdoutText(), "");
  assert.match(output.stderrText(), /^tool-error: help flag cannot be combined with input paths/);
});

test("clean input exits without output", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "stepdown-clean-"));
  try {
    const sourcePath = path.join(root, "clean.ts");
    await writeFile(sourcePath, "export function buildValue(): number {\n  return 1;\n}\n", "utf8");
    const output = captureOutput();

    const code = await runCli([sourcePath], output);

    assert.equal(code, 0);
    assert.equal(output.stdoutText(), "");
    assert.equal(output.stderrText(), "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("findings print sorted diagnostics and exit one", async () => {
  const output = captureOutput();
  const runner = async () => ({
    diagnostics: [
      {
        path: "b.ts",
        line: 2,
        column: 1,
        rule: "section-order",
        description: "module sections must appear as imports, declaration zone, then behavior zone",
      },
    ],
    toolError: null,
  });

  const code = await runCli(["b.ts"], output, runner);

  assert.equal(code, 1);
  assert.equal(
    output.stdoutText(),
    "b.ts:2:1: section-order: module sections must appear as imports, declaration zone, then behavior zone\n",
  );
  assert.equal(output.stderrText(), "");
});

test("tool errors print stderr and exit two", async () => {
  const output = captureOutput();

  const code = await runCli(["missing.ts"], output);

  assert.equal(code, 2);
  assert.equal(output.stdoutText(), "");
  assert.match(output.stderrText(), /^path-not-found: path does not exist/);
});

function captureOutput() {
  const stdout = [];
  const stderr = [];
  return {
    writeStdout: (line) => stdout.push(line),
    writeStderr: (line) => stderr.push(line),
    stdoutText: () => stdout.join(""),
    stderrText: () => stderr.join(""),
  };
}
