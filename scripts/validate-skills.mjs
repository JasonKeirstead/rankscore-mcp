#!/usr/bin/env node
// Checks the plugin's skills: frontmatter, size, tool names, leftovers from the SE Ranking source, and links.
// Tool names are taken from the built server (dist/), so run `npm run build` first.
// Exit code 1 when any error is found. Usage: npm run validate:skills

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RankScoreClient } from "../dist/client.js";
import { DashboardClient } from "../dist/dashboard.js";
import { createServer } from "../dist/server.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const plugin = join(root, "plugin");
const skillsDir = join(plugin, "skills");
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${relative(root, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(root, file)}: ${msg}`);

// Every tool the server can register: articles, project reads and writes.
async function toolNames() {
  const server = createServer({
    articles: new RankScoreClient({ apiKey: "validate-only" }),
    dashboard: new DashboardClient({ email: "validate@example.invalid", password: "validate-only" }),
    enableWrites: true,
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "validate", version: "0" });
  await Promise.all([server.connect(b), client.connect(a)]);
  const { tools } = await client.listTools();
  await client.close();
  const args = new Set(tools.flatMap((t) => Object.keys(t.inputSchema?.properties ?? {})));
  return { tools: new Set(tools.map((t) => t.name)), args };
}

const { tools: TOOLS, args: ARG_NAMES } = await toolNames();
const TOOL_LIKE = /\b(get|list|add|set|dismiss|toggle|create|rename|remove|generate|start|check|refresh|run)_[a-z][a-z0-9_]*\b/g;
// Names that look like tools but are not RankScore tools: Python functions, Firecrawl and Planable tools, file names.
const NOT_TOOLS = /^(get_(json|text|auth|credentials|config|service|access|token|api_key)\w*|run_(report|query|check)\w*|check_\w*_py|set_\w*_env)$/;
// Tools of the Planable MCP server, which the social skills use next to RankScore.
const THIRD_PARTY_TOOLS = new Set(["list_workspaces", "list_pages", "list_labels", "create_label", "create_post", "create_grouped_post", "create_comment", "list_posts", "get_post", "update_post", "delete_post", "list_campaigns", "create_campaign", "get_workspace_details", "get_page_metrics_summary", "get_post_metrics_summary", "get_post_metrics"]);

const DROPPED = ["seo-ads", "seo-backlink-gap", "seo-competitor-gap-analysis", "seo-subdomain", "seo-agency-landing-page", "local-gmb-visibility", "seo-keyword-niche"];
const LEFTOVERS = [/seranking/i, /SE Visible/i, /DataForSEO/i, /\bDATA_[A-Za-z]/, /\bPROJECT_[A-Za-z]/, /dir-edition/, /\.\.\/\.\.\/examples\//, /mcp__claude_ai_SE_Ranking/];
const ALLOWED_SE_RANKING = /Adapted from SE Ranking seo-skills|SE Ranking seo-skills \(MIT\)|THIRD_PARTY_NOTICES/;

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      fm[key] = kv[2].replace(/^["']|["']$/g, "");
    } else if (key && /^\s+/.test(line)) {
      fm[key] += " " + line.trim();
    }
  }
  return fm;
}

const skillNames = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory());
for (const name of skillNames) {
  const file = join(skillsDir, name, "SKILL.md");
  if (!existsSync(file)) {
    err(join(skillsDir, name), "no SKILL.md");
    continue;
  }
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const fm = frontmatter(text);
  if (!fm) {
    err(file, "no YAML frontmatter");
    continue;
  }
  const extra = Object.keys(fm).filter((k) => k !== "name" && k !== "description");
  if (extra.length) warn(file, `extra frontmatter keys: ${extra.join(", ")}`);
  if (fm.name !== name) err(file, `name "${fm.name}" does not match folder "${name}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name ?? "") || (fm.name ?? "").length > 64) err(file, "name must be lowercase-hyphen, at most 64 chars");
  if (/claude|anthropic/i.test(fm.name ?? "")) err(file, 'name must not contain "claude" or "anthropic"');
  const desc = fm.description ?? "";
  if (!desc) err(file, "description missing");
  if (desc.length > 1024 || Buffer.byteLength(desc) > 1024) err(file, `description is ${desc.length} chars / ${Buffer.byteLength(desc)} bytes (max 1024)`);
  if (/<\/?[a-zA-Z][^>]*>/.test(desc)) err(file, "description contains an angle-bracket tag");
  const lines = text.split("\n").length;
  if (lines > 400) err(file, `SKILL.md has ${lines} lines (max 400)`);
  if (!/## Process/.test(text)) warn(file, "no ## Process section");
  if (!/Adapted from SE Ranking seo-skills/.test(text)) err(file, "missing the SE Ranking attribution line");
}

for (const file of walk(plugin).filter((f) => f.endsWith(".md"))) {
  const rel = relative(plugin, file);
  if (/^(THIRD_PARTY_NOTICES|LICENSE)/.test(rel)) continue;
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  lines.forEach((line, i) => {
    for (const re of LEFTOVERS) if (re.test(line)) err(file, `line ${i + 1}: leftover ${re}: ${line.trim().slice(0, 120)}`);
    if (/SE Ranking/.test(line) && !ALLOWED_SE_RANKING.test(line)) err(file, `line ${i + 1}: mentions SE Ranking: ${line.trim().slice(0, 120)}`);
    for (const d of DROPPED) {
      if (new RegExp(`(^|[^a-z-])${d}([^a-z-]|$)`).test(line) && !/merged into|merge[ds]? (from|of)|was (merged|folded)|formerly/i.test(line)) {
        err(file, `line ${i + 1}: references dropped skill ${d}`);
      }
    }
  });

  // Tool-like names must be real tools (only inside backticks, to skip prose).
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    for (const t of m[1].matchAll(TOOL_LIKE)) {
      const name = t[0];
      if (TOOLS.has(name) || ARG_NAMES.has(name) || NOT_TOOLS.test(name) || THIRD_PARTY_TOOLS.has(name)) continue;
      if (t.index > 0 && m[1][t.index - 1] === ".") continue; // a method call such as module.get_x()
      if (/firecrawl|planable|mcp__/.test(m[1])) continue;
      err(file, `unknown tool name \`${name}\` in \`${m[1].slice(0, 80)}\``);
    }
  }

  // Relative links must resolve. Fenced code blocks hold examples written for another folder: skip them.
  const prose = text.replace(/```[\s\S]*?```/g, "");
  for (const m of prose.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)|`(\.\.?\/[^`\s]+\.(md|json|html|py|sh))`/g)) {
    const target = m[1] ?? m[3];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    if (target.includes("<") || target.includes("{")) continue;
    if (!existsSync(resolve(dirname(file), target))) err(file, `broken link: ${target}`);
  }
}

console.log(`skills: ${skillNames.length} (${skillNames.join(", ")})`);
console.log(`tools known: ${TOOLS.size}`);
for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`ERROR: ${e}`);
console.log(errors.length ? `${errors.length} error(s)` : "skills ok");
process.exit(errors.length ? 1 : 0);
