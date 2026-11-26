#!/usr/bin/env node
// Live WRITE check against the real RankScore dashboard. Run it yourself, and only when you accept the change below:
//
//   npm run build && npm run live-write-check -- <project-uuid> --yes
//
// It changes ONE thing and puts it back: the status of the pillar article of the first content-plan cluster.
//   1. read the status (get_content_plan)
//   2. set the other status (set_content_plan_item_status)
//   3. read it again and compare
//   4. set the original status back, read again and compare
// It starts no job, uses no credits and quota, creates nothing, and deletes nothing.
// If step 4 fails the script says so and prints the original status, so you can set it by hand.
//
// Credentials come from RANKSCORE_CREDENTIALS_FILE (default ~/rankscorekey), given to the server only.
// Output holds statuses and error text only: no credentials and no plan text.

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const projectId = args.find((a) => !a.startsWith("--")) ?? process.env.RANKSCORE_PROJECT_ID;

if (!projectId || !confirmed) {
  console.error("Usage: npm run live-write-check -- <project-uuid> --yes");
  console.error("It flips the status of the first cluster's pillar article in the content plan, then flips it back.");
  process.exit(2);
}
const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
if (!existsSync(entry)) {
  console.error("dist/index.js not found. Run: npm run build");
  process.exit(2);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry],
  env: {
    RANKSCORE_CREDENTIALS_FILE: process.env.RANKSCORE_CREDENTIALS_FILE ?? join(homedir(), "rankscorekey"),
    RANKSCORE_PROJECT_ID: projectId,
    RANKSCORE_ENABLE_WRITES: "1",
  },
  stderr: "pipe",
});
let serverStderr = "";
transport.stderr?.on("data", (d) => (serverStderr += d));
const mcp = new Client({ name: "live-write-check", version: "0" });
try {
  await mcp.connect(transport);
} catch (err) {
  console.error(`server did not start: ${err.message}\n${serverStderr.trim()}`);
  process.exit(1);
}

async function call(name, a = {}) {
  const r = await mcp.callTool({ name, arguments: a });
  const t = r.content?.[0]?.text ?? "";
  if (r.isError) throw new Error(`${name}: ${t.slice(0, 300)}`);
  return JSON.parse(t || "{}");
}
const pillarStatus = async () => {
  const plan = await call("get_content_plan");
  const cluster = plan?.plan?.clusters?.[0];
  if (!cluster?.pillar_article) throw new Error("the plan has no first cluster with a pillar_article");
  return cluster.pillar_article.status ?? "not_started";
};

let original;
let exitCode = 0;
try {
  const names = (await mcp.listTools()).tools.map((t) => t.name);
  if (!names.includes("set_content_plan_item_status")) throw new Error("write tools are not enabled (is the email and password in the credentials file?)");

  original = await pillarStatus();
  const flipped = original === "published" ? "not_started" : "published";
  console.log(`1. original status of cluster 0 pillar: ${original}`);

  await call("set_content_plan_item_status", { cluster_index: 0, article_type: "pillar", status: flipped });
  const after = await pillarStatus();
  console.log(`2. set to ${flipped}; read back: ${after} -> ${after === flipped ? "ok" : "MISMATCH"}`);
  if (after !== flipped) exitCode = 1;

  await call("set_content_plan_item_status", { cluster_index: 0, article_type: "pillar", status: original });
  const restored = await pillarStatus();
  console.log(`3. set back to ${original}; read back: ${restored} -> ${restored === original ? "ok" : "MISMATCH"}`);
  if (restored !== original) exitCode = 1;
  original = undefined; // restored: nothing to report
} catch (err) {
  exitCode = 1;
  console.log(`FAIL ${err.message}`);
  if (original !== undefined) console.log(`The original status of cluster 0 pillar was "${original}". Check it in the dashboard (Topic Clusters) and set it by hand if it differs.`);
} finally {
  await mcp.close();
}
console.log(exitCode ? "write check FAILED" : "write check ok: changed and restored");
process.exit(exitCode);
