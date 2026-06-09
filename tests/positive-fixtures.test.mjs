import assert from "node:assert/strict";
import { test } from "node:test";

import { runStepdown } from "../dist/walker.js";

test("positive fixtures emit no diagnostics", async () => {
  const result = await runStepdown({ paths: ["fixtures/positive"] });

  assert.equal(result.toolError, null);
  assert.deepEqual(result.diagnostics, []);
});
