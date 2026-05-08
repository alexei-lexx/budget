// Banner injected verbatim at the top of every ESM lambda bundle by esbuild
// (see build:bundle:* scripts in package.json).
// Restores `require` so bundled CJS deps that perform dynamic require()
// (e.g. aws-xray-sdk-core loading node:diagnostics_channel) keep working.
// esbuild's __require helper reads `require` from this scope at bundle init.

import { createRequire } from "module";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const require = createRequire(import.meta.url);
