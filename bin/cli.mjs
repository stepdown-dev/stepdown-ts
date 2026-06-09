#!/usr/bin/env node
// stepdown-ts binary shim — loads the compiled CLI from dist/.
// Build with `npm run build` before invoking.

import("../dist/cli.js")
  .then((cli) => cli.main())
  .catch((err) => {
    console.error("stepdown-ts: failed to load — did you run `npm run build`?");
    console.error(err);
    process.exit(2);
  });
