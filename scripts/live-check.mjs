#!/usr/bin/env node
// Live check against the real RankScore services. Run it yourself: npm run live-check
//
// It starts the built MCP server over stdio, with the credentials file given to the SERVER
// (this script never reads the key, email or password), then calls each tool once and prints a summary.
// Output holds status, sizes and key names only: no credentials and no article text.
//
// Usage: npm run build && npm run live-check -- [project-uuid]
//   RANKSCORE_CREDENTIALS_FILE  default ~/rankscorekey (line 1 API key, line 2 email, line 3 password)
//   RANKSCORE_PROJECT_ID        or pass the project UUID as the first argument

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
if (!existsSync(entry)) {
  console.error("dist/index.js not found. Run: npm run build");
  process.exit(2);
}

const credentialsFile = process.env.RANKSCORE_CREDENTIALS_FILE ?? join(homedir(), "rankscorekey");
const projectId = process.argv[2] ?? process.env.RANKSCORE_PROJECT_ID;

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry],
  env: { RANKSCORE_CREDENTIALS_FILE: credentialsFile, ...(projectId ? { RANKSCORE_PROJECT_ID: projectId } : {}) },
  stderr: "pipe",
});
let serverStderr = "";
transport.stderr?.on("data", (d) => (serverStderr += d));

const mcp = new Client({ name: "live-check", version: "0" });
try {
  await mcp.connect(transport);
} catch (err) {
  console.error(`server did not start: ${err.message}`);
  console.error(serverStderr.trim());
  process.exit(1);
}

const shape = (v) => (Array.isArray(v) ? `array(${v.length})` : v === null ? "null" : typeof v === "object" ? `{${Object.keys(v).join(",")}}` : typeof v);
let failures = 0;

async function call(name, args = {}) {
  const r = await mcp.callTool({ name, arguments: args });
  const text = r.content?.[0]?.text ?? "";
  if (r.isError) {
    failures++;
    console.log(`FAIL ${name}: ${text.slice(0, 300)}`);
    return undefined;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  console.log(`ok   ${name}: ${text.length} chars ${parsed === undefined ? "(not JSON)" : shape(parsed)}`);
  return parsed;
}

try {
  const tools = (await mcp.listTools()).tools;
  // Only read-only tools are ever called here, even if write tools are enabled.
  const names = tools.filter((t) => t.annotations?.readOnlyHint === true).map((t) => t.name);
  console.log(`tools: ${tools.length} registered, ${names.length} read-only: ${names.join(", ")}`);
  if (serverStderr.trim()) console.log(`server stderr: ${serverStderr.trim().split("\n").slice(0, 5).join(" | ")}`);

  if (names.includes("list_articles")) {
    const list = await call("list_articles", { limit: 2 });
    const id = list?.articles?.[0]?.id;
    if (id) await call("get_article", { id });
  }

  const projectTools = names.filter((n) => n !== "list_articles" && n !== "get_article");
  if (projectTools.length) {
    if (!projectId) {
      console.log("SKIP project tools: pass a project UUID or set RANKSCORE_PROJECT_ID");
    } else {
      // Tools that need an id get it from an earlier read; they run last.
      const NEEDS_IDS = ["get_keyword_discovery_run", "get_keyword_serp", "get_ai_visibility_response"];
      const results = {};
      for (const name of projectTools.filter((n) => !NEEDS_IDS.includes(n))) {
        results[name] = await call(name, name === "get_backlink_report" ? { max_rows: 3 } : {});
      }
      const runId = results.get_keyword_discovery_runs?.runs?.find((r) => !r.error)?.id;
      const judgementId = results.get_ai_visibility?.latestJudgements?.[0]?.id;
      let keywordId;
      if (projectTools.includes("get_keyword_discovery_run")) {
        if (runId) keywordId = (await call("get_keyword_discovery_run", { run_id: runId }))?.keywords?.[0]?.id;
        else console.log("SKIP get_keyword_discovery_run: no keyword discovery run");
      }
      if (projectTools.includes("get_keyword_serp")) {
        if (runId && keywordId) await call("get_keyword_serp", { run_id: runId, keyword_id: keywordId });
        else console.log("SKIP get_keyword_serp: no run keyword");
      }
      if (projectTools.includes("get_ai_visibility_response")) {
        if (judgementId) await call("get_ai_visibility_response", { judgement_id: judgementId });
        else console.log("SKIP get_ai_visibility_response: no AI visibility judgement");
      }
    }
  } else {
    console.log("no login credentials in the file: project tools not enabled");
  }
} finally {
  await mcp.close();
}
console.log(failures ? `${failures} call(s) failed` : "all calls ok");
process.exit(failures ? 1 : 0);
