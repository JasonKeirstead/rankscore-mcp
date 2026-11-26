import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DashboardClient } from "../src/dashboard.js";
import { createServer } from "../src/server.js";
import { WRITE_TOOL_NAMES } from "../src/write-tools.js";
import { ANON, Backend, EMAIL, PASSWORD, PID } from "./mock-backend.js";

const b = new Backend();
beforeAll(() => b.start());
afterAll(() => b.close());
beforeEach(() => b.reset());

async function connect(enableWrites = true) {
  const dashboard = new DashboardClient({ email: EMAIL, password: PASSWORD, origin: b.origin, supabaseUrl: b.supabaseUrl, supabaseAnonKey: ANON, retryBaseMs: 1 });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const server = createServer({ dashboard, defaultProjectId: PID, enableWrites });
  const mcp = new Client({ name: "test", version: "0" });
  await Promise.all([server.connect(serverT), mcp.connect(clientT)]);
  return mcp;
}

const text = (r: unknown) => ((r as CallToolResult).content[0] as { text: string }).text;
const failed = (r: unknown) => r instanceof Error || (r as CallToolResult).isError === true;

interface Case {
  tool: string;
  args: Record<string, unknown>;
  method: string;
  path: string;
  body: unknown;
}

const CASES: Case[] = [
  { tool: "add_calendar_entry", args: { title: "T", target_keyword: "k", scheduled_for: "2026-12-01" }, method: "POST", path: "calendar", body: { title: "T", target_keyword: "k", scheduled_for: "2026-12-01" } },
  { tool: "set_content_plan_item_status", args: { cluster_index: 1, article_type: "pillar", status: "published" }, method: "PATCH", path: "content-plan", body: { clusterIndex: 1, articleType: "pillar", status: "published" } },
  { tool: "set_content_plan_item_status", args: { cluster_index: 0, article_type: "supporting", supporting_index: 2, status: "not_started" }, method: "PATCH", path: "content-plan", body: { clusterIndex: 0, articleType: "supporting", supportingIndex: 2, status: "not_started" } },
  { tool: "dismiss_next_action", args: { rule_id: "connect_wordpress" }, method: "PATCH", path: "next-actions", body: { ruleId: "connect_wordpress" } },
  { tool: "toggle_keyword_bookmark", args: { keyword_id: "kw-1" }, method: "PATCH", path: "keyword-discovery/keywords/kw-1/bookmark", body: undefined },
  { tool: "add_tracked_keyword", args: { keyword: "seo", target_url: "https://example.com/a" }, method: "POST", path: "tracked-keywords", body: { keyword: "seo", target_url: "https://example.com/a" } },
  { tool: "create_keyword_group", args: { name: "G" }, method: "POST", path: "ranked-keywords/groups", body: { name: "G" } },
  { tool: "rename_keyword_group", args: { group_id: "g1", name: "N" }, method: "PATCH", path: "ranked-keywords/groups/g1", body: { name: "N" } },
  { tool: "add_keywords_to_group", args: { group_id: "g1", keywords: ["a", "b"] }, method: "POST", path: "ranked-keywords/groups/g1/members", body: { keywords: ["a", "b"] } },
  { tool: "remove_keyword_from_group", args: { group_id: "g1", keyword: "a" }, method: "DELETE", path: "ranked-keywords/groups/g1/members", body: { keyword: "a" } },
  {
    tool: "set_ai_visibility_config",
    args: { brand_name: " B ", domain: " b.com ", queries: [{ query_text: "q1" }, { query_text: "q2", source: "suggested" }] },
    method: "PUT",
    path: "ai-visibility/config",
    body: {
      brand_name: "B",
      domain: "b.com",
      aliases: [],
      enabled: true,
      queries: [
        { query_text: "q1", source: "manual" },
        { query_text: "q2", source: "suggested" },
      ],
      kickoff: false,
    },
  },
  { tool: "generate_article", args: { topic: " Topic ", target_keyword: " kw " }, method: "POST", path: "articles/generate", body: { topic: "Topic", target_keyword: "kw", word_count: 1500, angle_notes: null } },
  { tool: "generate_article", args: { topic: "T", target_keyword: "k", word_count: 800, angle_notes: " note " }, method: "POST", path: "articles/generate", body: { topic: "T", target_keyword: "k", word_count: 800, angle_notes: "note" } },
  { tool: "generate_content_plan", args: { mode: "extend" }, method: "POST", path: "content-plan", body: { mode: "extend" } },
  {
    tool: "generate_content_plan",
    args: { mode: "rebuild", focus_topics: ["a"], avoid_topics: [], cluster_count: 4, notes: " n " },
    method: "POST",
    path: "content-plan",
    body: { mode: "rebuild", focus_topics: ["a"], cluster_count: 4, notes: "n" },
  },
  { tool: "start_keyword_discovery_run", args: { seed: " shoes " }, method: "POST", path: "keyword-discovery/runs", body: { source: "suggestions", seeds: ["shoes"], min_volume: 0 } },
  { tool: "check_tracked_keyword_positions", args: {}, method: "POST", path: "tracked-keywords/check-positions", body: undefined },
  { tool: "refresh_ranked_keywords_report", args: {}, method: "POST", path: "ranked-keywords/refresh", body: {} },
  { tool: "refresh_backlink_report", args: {}, method: "POST", path: "backlink-report/refresh", body: {} },
  { tool: "run_site_health", args: {}, method: "POST", path: "site-health", body: { force_rerun: false } },
  { tool: "run_site_health", args: { force_rerun: true }, method: "POST", path: "site-health", body: { force_rerun: true } },
  {
    tool: "generate_listing_description",
    args: { business_name: "Acme", primary_category: "Plumber" },
    method: "POST",
    path: "listing/description/generate",
    body: { business_name: "Acme", primary_category: "Plumber", secondary_categories: [], city: null, state: null, description: null },
  },
];

describe("write tools: registration", () => {
  it("are absent unless writes are enabled", async () => {
    const names = (await (await connect(false)).listTools()).tools.map((t) => t.name);
    for (const n of WRITE_TOOL_NAMES) expect(names).not.toContain(n);
    expect(names).toContain("get_content_plan");
  });

  it("are all registered when writes are enabled, next to the read tools", async () => {
    const names = (await (await connect(true)).listTools()).tools.map((t) => t.name);
    for (const n of WRITE_TOOL_NAMES) expect(names).toContain(n);
    expect(names).toContain("get_content_plan");
    expect(WRITE_TOOL_NAMES).toHaveLength(18);
  });

  it("have a test case each", () => {
    expect([...new Set(CASES.map((c) => c.tool))].sort()).toEqual([...WRITE_TOOL_NAMES].sort());
  });

  it("say they change data: not read-only, and destructive only where data can be overwritten", async () => {
    const { tools } = await (await connect(true)).listTools();
    const writes = tools.filter((t) => WRITE_TOOL_NAMES.includes(t.name));
    expect(writes).toHaveLength(WRITE_TOOL_NAMES.length);
    for (const t of writes) {
      expect(t.annotations?.readOnlyHint, t.name).toBe(false);
      expect(t.description, t.name).toContain("CHANGES DATA");
    }
    const destructive = writes.filter((t) => t.annotations?.destructiveHint).map((t) => t.name).sort();
    expect(destructive).toEqual(["generate_content_plan", "set_ai_visibility_config"]);
  });

  it("do not include listing edits, calendar edits, deletes or publish calls", () => {
    for (const n of WRITE_TOOL_NAMES) {
      expect(n).not.toMatch(/delete|publish|remove_(article|project|calendar|tracked)|update_listing|update_calendar/);
    }
  });
});

describe("write tools: requests", () => {
  for (const c of CASES) {
    it(`${c.tool} ${JSON.stringify(c.args).slice(0, 60)} -> ${c.method} ${c.path}`, async () => {
      const mcp = await connect();
      const r = await mcp.callTool({ name: c.tool, arguments: c.args });
      expect(r.isError, text(r)).toBeFalsy();
      expect(b.dashCalls).toHaveLength(1);
      expect(b.dashCalls[0]).toMatchObject({ method: c.method, url: `/api/projects/${PID}/${c.path}` });
      expect(b.dashCalls[0]!.body).toEqual(c.body);
    });
  }

  it("uses an explicit project_id over the default", async () => {
    const other = "99999999-8888-7777-6666-555555555555";
    const mcp = await connect();
    await mcp.callTool({ name: "create_keyword_group", arguments: { project_id: other, name: "G" } });
    expect(b.dashCalls[0]?.url).toBe(`/api/projects/${other}/ranked-keywords/groups`);
  });

  it("returns what the dashboard answered", async () => {
    b.dashResponder = () => ({ status: 200, body: { articleId: "art-1" } });
    const mcp = await connect();
    const r = await mcp.callTool({ name: "generate_article", arguments: { topic: "T", target_keyword: "k" } });
    expect(JSON.parse(text(r))).toEqual({ articleId: "art-1" });
  });

  it("returns {} when the dashboard answers 200 with no body", async () => {
    b.dashResponder = () => ({ status: 200 });
    const mcp = await connect();
    const r = await mcp.callTool({ name: "toggle_keyword_bookmark", arguments: { keyword_id: "kw-1" } });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(text(r))).toEqual({});
  });
});

describe("write tools: refusals", () => {
  it("send nothing when the arguments are invalid", async () => {
    const mcp = await connect();
    const bad: [string, Record<string, unknown>][] = [
      ["add_calendar_entry", { title: "T", target_keyword: "k", scheduled_for: "12/01/2026" }],
      ["add_calendar_entry", { title: "", target_keyword: "k", scheduled_for: "2026-12-01" }],
      ["rename_keyword_group", { group_id: "../x", name: "N" }],
      ["rename_keyword_group", { group_id: "a/b", name: "N" }],
      ["toggle_keyword_bookmark", { keyword_id: ".." }],
      ["toggle_keyword_bookmark", { keyword_id: "a?x=1" }],
      ["generate_article", { topic: "T", target_keyword: "k", word_count: 100 }],
      ["generate_content_plan", { mode: "delete_everything" }],
      ["generate_content_plan", { mode: "extend", cluster_count: 0 }],
      ["set_ai_visibility_config", { brand_name: "B", domain: "b.com", queries: [] }],
      ["dismiss_next_action", { rule_id: "a b" }],
      ["create_keyword_group", { project_id: "../../admin", name: "G" }],
    ];
    for (const [tool, args] of bad) {
      const r = await mcp.callTool({ name: tool, arguments: args }).catch((e: unknown) => e);
      expect(failed(r), `${tool} ${JSON.stringify(args)}`).toBe(true);
    }
    expect(b.dashCalls).toHaveLength(0);
    expect(b.tokenCalls).toHaveLength(0);
  });

  it("send nothing for a supporting article without supporting_index", async () => {
    const mcp = await connect();
    const r = await mcp.callTool({ name: "set_content_plan_item_status", arguments: { cluster_index: 0, article_type: "supporting", status: "published" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("supporting_index is required");
    expect(b.dashCalls).toHaveLength(0);
  });

  it("ask for a project when none is given and no default exists", async () => {
    const dashboard = new DashboardClient({ email: EMAIL, password: PASSWORD, origin: b.origin, supabaseUrl: b.supabaseUrl, supabaseAnonKey: ANON });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: "test", version: "0" });
    await Promise.all([createServer({ dashboard, enableWrites: true }).connect(serverT), mcp.connect(clientT)]);
    const r = await mcp.callTool({ name: "create_keyword_group", arguments: { name: "G" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("project_id is required");
    expect(b.dashCalls).toHaveLength(0);
  });
});

describe("write tools: errors from the dashboard", () => {
  it("shows a quota refusal with its limit and reset time, and does not repeat the write", async () => {
    b.dashResponder = () => ({ status: 429, body: { message: "Keyword Discovery runs used up", tokens: 5, limit: 5, resetTime: "in 7h" } });
    const mcp = await connect();
    const r = await mcp.callTool({ name: "start_keyword_discovery_run", arguments: { seed: "shoes" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("HTTP 429");
    expect(text(r)).toContain("limit 5");
    expect(text(r)).toContain("resets in 7h");
    expect(b.dashCalls).toHaveLength(1);
  });

  it("shows a 409 conflict", async () => {
    b.dashResponder = () => ({ status: 409, body: { error: "That keyword is already tracked." } });
    const mcp = await connect();
    const r = await mcp.callTool({ name: "add_tracked_keyword", arguments: { keyword: "seo", target_url: "https://example.com" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("HTTP 409");
    expect(text(r)).toContain("already tracked");
  });

  it("never puts the password in a failed write", async () => {
    b.echoCredentials = true;
    const dashboard = new DashboardClient({ email: EMAIL, password: "wrong-pw-for-write", origin: b.origin, supabaseUrl: b.supabaseUrl, supabaseAnonKey: ANON });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: "test", version: "0" });
    await Promise.all([createServer({ dashboard, defaultProjectId: PID, enableWrites: true }).connect(serverT), mcp.connect(clientT)]);
    const r = await mcp.callTool({ name: "create_keyword_group", arguments: { name: "G" } });
    expect(r.isError).toBe(true);
    expect(text(r)).not.toContain("wrong-pw-for-write");
    expect(b.dashCalls).toHaveLength(0);
  });
});

describe("write tools: stdio entry point", () => {
  const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

  async function toolNames(extraEnv: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), "rsmcp-"));
    const file = join(dir, "creds");
    writeFileSync(file, `\n${EMAIL}\n${PASSWORD}\n`, { mode: 0o600 });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: {
        RANKSCORE_CREDENTIALS_FILE: file,
        RANKSCORE_PROJECT_ID: PID,
        RANKSCORE_DASHBOARD_ORIGIN: b.origin,
        RANKSCORE_SUPABASE_URL: b.supabaseUrl,
        RANKSCORE_SUPABASE_ANON_KEY: ANON,
        ...extraEnv,
      },
      stderr: "pipe",
    });
    const mcp = new Client({ name: "test", version: "0" });
    await mcp.connect(transport);
    try {
      const names = (await mcp.listTools()).tools.map((t) => t.name);
      const r = names.includes("create_keyword_group") ? await mcp.callTool({ name: "create_keyword_group", arguments: { name: "G" } }) : undefined;
      return { names, r };
    } finally {
      await mcp.close();
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("registers the write tools only with RANKSCORE_ENABLE_WRITES=1, and a write works end to end", async () => {
    const off = await toolNames({});
    expect(off.names).not.toContain("generate_article");
    const on = await toolNames({ RANKSCORE_ENABLE_WRITES: "1" });
    expect(on.names).toContain("generate_article");
    expect(on.r?.isError).toBeFalsy();
    expect(b.dashCalls.at(-1)).toMatchObject({ method: "POST", url: `/api/projects/${PID}/ranked-keywords/groups`, body: { name: "G" } });
  });
});
