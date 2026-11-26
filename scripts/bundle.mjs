#!/usr/bin/env node
// Bundles the MCP server and its npm dependencies into one file: plugin/server/index.mjs.
// The Claude plugin runs that file directly. The plugin folder has no package.json, so
// Claude Code does not run npm install when the plugin is installed.

import { readFileSync } from "node:fs";
import { build } from "esbuild";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

await build({
  entryPoints: ["src/index.ts"],
  outfile: "plugin/server/index.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  minify: true,
  // Keeps the license notices of the bundled dependencies.
  legalComments: "eof",
  // The bundle has no package.json next to it: build the version in.
  define: { "process.env.RANKSCORE_MCP_BUILD_VERSION": JSON.stringify(version) },
  // Some dependencies are CommonJS and call require(); give the ESM bundle a require.
  banner: { js: 'import { createRequire as __rsCreateRequire } from "node:module"; const require = __rsCreateRequire(import.meta.url);' },
  logLevel: "info",
});
