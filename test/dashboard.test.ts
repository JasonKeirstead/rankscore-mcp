import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RankScoreClient } from "../src/client.js";
import { ConfigError } from "../src/config.js";
import { DashboardClient, sessionCookieHeader, type DashboardClientOptions, type Session } from "../src/dashboard.js";
import { createServer } from "../src/server.js";
import { ANON, Backend, COOKIE, EMAIL, PASSWORD, PID, parseCookie } from "./mock-backend.js";

const b = new Backend();
beforeAll(() => b.start());
afterAll(() => b.close());
beforeEach(() => b.reset());

function makeClient(over: Partial<DashboardClientOptions> = {}) {
  return new DashboardClient({
    email: EMAIL,
    password: PASSWORD,
    origin: b.origin,
    supabaseUrl: b.supabaseUrl,
    supabaseAnonKey: ANON,
    retryBaseMs: 1,
    ...over,
  });
}

/** A clock the test moves by hand. */
function fakeClock(start = 1_700_000_000_000) {
  const c = { t: start, now: () => c.t, advanceS: (s: number) => (c.t += s * 1000) };
  return c;
}

async function connect(opts: { articles?: boolean; defaultProjectId?: string; client?: DashboardClient } = {}) {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const server = createServer({
    dashboard: opts.client ?? makeClient(),
    articles: opts.articles ? new RankScoreClient({ apiKey: "k", baseUrl: `${b.origin}/api/integrations/v1` }) : undefined,
    defaultProjectId: opts.defaultProjectId,
  });
  const mcp = new Client({ name: "test", version: "0" });
  await Promise.all([server.connect(serverT), mcp.connect(clientT)]);
  return mcp;
}

const text = (r: unknown) => ((r as CallToolResult).content[0] as { text: string }).text;
const grants = () => b.tokenCalls.map((t) => t.grant);

describe("sessionCookieHeader", () => {
  const session: Session = { access_token: "a", refresh_token: "r", user: { id: "u" } };

  it("uses the sb-<ref>-auth-token name and a base64- prefixed base64url JSON value", () => {
    const header = sessionCookieHeader("https://abcdef.supabase.co", session);
    expect(header.startsWith("sb-abcdef-auth-token=base64-")).toBe(true);
    const value = header.slice("sb-abcdef-auth-token=base64-".length);
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(JSON.parse(Buffer.from(value, "base64url").toString())).toEqual(session);
  });

  it("splits a long value into .0 .1 chunks of at most 3180 characters", () => {
    const big: Session = { ...session, user: { blob: "x".repeat(9000) } };
    const parts = sessionCookieHeader("https://abcdef.supabase.co", big).split("; ");
    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((p, i) => {
      expect(p.slice(0, p.indexOf("="))).toBe(`sb-abcdef-auth-token.${i}`);
      expect(p.slice(p.indexOf("=") + 1).length).toBeLessThanOrEqual(3180);
    });
  });
});

describe("DashboardClient: login", () => {
  it("logs in with the password grant and the anon key, and the password stays out of the URL", async () => {
    const r = await makeClient().get<{ echoed: string }>(`/api/projects/${PID}/content-plan`);
    expect(r.echoed).toBe(`/api/projects/${PID}/content-plan`);
    expect(b.tokenCalls).toHaveLength(1);
    const call = b.tokenCalls[0]!;
    expect(call).toMatchObject({ grant: "password", body: { email: EMAIL, password: PASSWORD } });
    expect(call.url).toBe("/auth/v1/token?grant_type=password");
    expect(call.url).not.toContain(PASSWORD);
    expect(call.url).not.toContain(EMAIL);
    expect(call.headers.apikey).toBe(ANON);
    expect(call.headers.authorization).toBe(`Bearer ${ANON}`);
    expect(parseCookie(b.dashCalls[0]!.cookie)?.access_token).toBe("access-1");
  });

  it("logs in once and reuses the session", async () => {
    const c = makeClient();
    await c.get("/api/a");
    await c.get("/api/b");
    expect(b.tokenCalls).toHaveLength(1);
    expect(b.dashCalls).toHaveLength(2);
  });

  it("shares one login between concurrent calls", async () => {
    const c = makeClient();
    await Promise.all([c.get("/api/a"), c.get("/api/b"), c.get("/api/c")]);
    expect(b.tokenCalls).toHaveLength(1);
  });

  it("sends a chunked cookie the server can rebuild when the session is large", async () => {
    b.sessionExtra = { blob: "y".repeat(8000) };
    await makeClient().get("/api/a");
    expect(b.dashCalls[0]!.cookie).toContain(`${COOKIE}.0=`);
    expect(b.dashCalls[0]!.cookie).toContain(`${COOKIE}.1=`);
    expect(parseCookie(b.dashCalls[0]!.cookie)?.access_token).toBe("access-1");
  });

  it("does not follow a redirect on the login POST: the password body never reaches another host", async () => {
    b.tokenRedirect = true;
    await expect(makeClient().get("/api/a")).rejects.toThrow(/HTTP 307/);
    expect(b.otherHits).toEqual([]);
    expect(b.dashCalls).toHaveLength(0);
  });

  it("does not follow a redirect on a data call: the cookie never reaches another host", async () => {
    await expect(makeClient().get("/api/redirect")).rejects.toThrow(/HTTP 307/);
    expect(b.otherHits).toEqual([]);
  });

  it("does not follow a redirect from the documented API either", async () => {
    const client = new RankScoreClient({ apiKey: "k", baseUrl: `${b.origin}/api/redirect` });
    await expect(client.listArticles()).rejects.toThrow(/HTTP 307/);
    expect(b.otherHits).toEqual([]);
  });
});

describe("DashboardClient: bad credentials", () => {
  it("reports the failure without the password or the email", async () => {
    const err = await makeClient({ password: "wrong-password-123" }).get("/api/a").catch((e: Error) => e);
    const message = (err as Error).message;
    expect(message).toContain("RankScore login failed");
    expect(message).toContain("Invalid login credentials");
    expect(message).not.toContain("wrong-password-123");
    expect(message).not.toContain(EMAIL);
    expect(b.dashCalls).toHaveLength(0);
  });

  it("redacts the login even when the server echoes it back", async () => {
    b.echoCredentials = true;
    const err = await makeClient({ password: "wrong-password-123" }).get("/api/a").catch((e: Error) => e);
    const message = (err as Error).message;
    expect(message).toContain("Invalid login for");
    expect(message).not.toContain("wrong-password-123");
    expect(message).not.toContain(EMAIL);
    expect(message).toContain("***");
  });

  it("does not send the password again for 30 s after a failed login", async () => {
    const clock = fakeClock();
    const c = makeClient({ password: "wrong-password-123", now: clock.now });
    await expect(c.get("/api/a")).rejects.toThrow(/login failed/);
    await expect(c.get("/api/b")).rejects.toThrow(/login failed/);
    await expect(c.get("/api/c")).rejects.toThrow(/login failed/);
    expect(b.tokenCalls).toHaveLength(1);
    clock.advanceS(31);
    await expect(c.get("/api/d")).rejects.toThrow(/login failed/);
    expect(b.tokenCalls).toHaveLength(2);
  });

  it("does not retry the login POST on 429, and pauses afterwards", async () => {
    b.passwordStatus = 429;
    const c = makeClient({ now: fakeClock().now }); // default maxRetries is 2 for GET
    await expect(c.get("/api/a")).rejects.toThrow(/rate limited/);
    expect(b.tokenCalls).toHaveLength(1); // one POST, no retries
    await expect(c.get("/api/a")).rejects.toThrow(/rate limited/);
    expect(b.tokenCalls).toHaveLength(1); // paused
  });

  it("stops after one re-login when the dashboard keeps answering 401, and then pauses", async () => {
    const clock = fakeClock();
    const c = makeClient({ now: clock.now });
    b.rejectDashboard = true;
    await expect(c.get("/api/a")).rejects.toThrow(/HTTP 401/);
    expect(grants()).toEqual(["password", "password"]);
    expect(b.dashCalls).toHaveLength(2);
    // Within the pause: no login, no request.
    await expect(c.get("/api/b")).rejects.toThrow(/HTTP 401/);
    expect(b.tokenCalls).toHaveLength(2);
    expect(b.dashCalls).toHaveLength(2);
    // After the pause it tries again.
    clock.advanceS(31);
    b.rejectDashboard = false;
    await expect(c.get("/api/c")).resolves.toBeTruthy();
  });
});

describe("DashboardClient: session lifetime", () => {
  it("refreshes with the refresh token when the session is about to expire", async () => {
    b.expiresIn = 30; // inside the safety margin
    const c = makeClient();
    await c.get("/api/a");
    b.expiresIn = 3600;
    await c.get("/api/b");
    expect(grants()).toEqual(["password", "refresh_token"]);
    expect(b.tokenCalls[1]?.body).toEqual({ refresh_token: "refresh-1" });
    expect(parseCookie(b.dashCalls[1]!.cookie)?.access_token).toBe("access-2");
  });

  it("renews on the local clock: 2 minutes before expires_in runs out, not before", async () => {
    const clock = fakeClock();
    const c = makeClient({ now: clock.now });
    await c.get("/api/a"); // login, expires_in 3600
    clock.advanceS(3600 - 130);
    await c.get("/api/b");
    expect(grants()).toEqual(["password"]);
    clock.advanceS(20); // now 110 s from expiry: inside the 120 s margin
    await c.get("/api/c");
    expect(grants()).toEqual(["password", "refresh_token"]);
  });

  it("follows expires_in, not the server's expires_at, so a wrong local clock does not cause refresh storms", async () => {
    b.expiresAtOverride = 1; // the server's timestamp is in 1970
    const c = makeClient();
    await c.get("/api/a");
    await c.get("/api/b");
    await c.get("/api/c");
    expect(grants()).toEqual(["password"]);
    // The cookie still carries the server's value untouched.
    expect(parseCookie(b.dashCalls[2]!.cookie)?.expires_at).toBe(1);
  });

  it("falls back to the password when the refresh token is rejected", async () => {
    b.expiresIn = 30;
    const c = makeClient();
    await c.get("/api/a");
    b.validRefresh.clear();
    b.expiresIn = 3600;
    await c.get("/api/b");
    expect(grants()).toEqual(["password", "refresh_token", "password"]);
  });

  it("does not fall back to the password when the refresh fails with 429 or a server error", async () => {
    b.expiresIn = 30;
    const c = makeClient();
    await c.get("/api/a");
    b.refreshStatus = 429;
    await expect(c.get("/api/b")).rejects.toThrow(/HTTP 429/);
    b.refreshStatus = 503;
    await expect(c.get("/api/b")).rejects.toThrow(/HTTP 503/);
    expect(grants()).toEqual(["password", "refresh_token", "refresh_token"]);
  });

  it("signs in again once when the dashboard answers 401, then succeeds", async () => {
    const c = makeClient();
    await c.get("/api/a");
    b.validAccess.clear(); // the server forgets the session
    const r = await c.get<{ echoed: string }>("/api/b");
    expect(r.echoed).toBe("/api/b");
    expect(grants()).toEqual(["password", "password"]);
  });

  it("does not force a second login for a call whose 401 arrives after another call already re-logged in", async () => {
    const c = makeClient();
    await c.get("/api/a"); // session access-1
    b.validAccess.clear(); // the server forgets it: every call with access-1 gets a 401
    // /api/slow sends its request now but its 401 comes 200 ms later, after /api/b has re-logged in.
    const slow = c.get("/api/slow");
    const fast = c.get("/api/b");
    await expect(Promise.all([slow, fast])).resolves.toBeTruthy();
    expect(grants()).toEqual(["password", "password"]);
  });
});

describe("DashboardClient: requests", () => {
  it("does not retry a write on 429, and a GET still retries", async () => {
    let n = 0;
    b.dashResponder = () => (++n < 3 ? { status: 429, body: { message: "slow", limit: 5, resetTime: "in 2h" }, headers: { "retry-after": "0" } } : { status: 200, body: { ok: true } });
    const c = makeClient();
    const err = await c.request("POST", "/api/projects/x/jobs", {}).catch((e: Error) => e);
    expect((err as Error).message).toContain("HTTP 429");
    expect((err as Error).message).toContain("limit 5");
    expect((err as Error).message).toContain("resets in 2h");
    expect(b.dashCalls).toHaveLength(1);
    await expect(c.get("/api/projects/x/jobs")).resolves.toEqual({ ok: true });
    expect(b.dashCalls).toHaveLength(3); // 1 refused write + 2 GET attempts
  });

  it("sends the method and the JSON body, and a 200 with an empty body gives {}", async () => {
    b.dashResponder = () => ({ status: 200 });
    const out = await makeClient().request("PATCH", "/api/projects/x/thing", { a: 1 });
    expect(out).toEqual({});
    expect(b.dashCalls[0]).toMatchObject({ method: "PATCH", body: { a: 1 } });
  });

  it("repeats a write once after a 401 (the first try was not processed)", async () => {
    const c = makeClient();
    await c.get("/api/a");
    b.validAccess.clear();
    await c.request("POST", "/api/projects/x/job", { n: 1 });
    expect(b.dashCalls.filter((d) => d.method === "POST")).toHaveLength(2);
    expect(grants()).toEqual(["password", "password"]);
  });

  it("refuses to send the password over plain http to a non-local host, and never prints the URL", () => {
    expect(() => makeClient({ supabaseUrl: "http://example.com" })).toThrow(ConfigError);
    expect(() => makeClient({ origin: "http://example.com" })).toThrow(ConfigError);
    expect(() => makeClient({ supabaseUrl: "https://abc.supabase.co", origin: "https://dashboard.rankscore.co" })).not.toThrow();
    for (const bad of ["https://user:HUNTER2@bad host", "not a url"]) {
      const err = (() => {
        try {
          makeClient({ origin: bad });
        } catch (e) {
          return e as Error;
        }
      })();
      expect(err).toBeInstanceOf(ConfigError);
      expect(err!.message).not.toContain("HUNTER2");
      expect(err!.message).not.toContain(bad);
    }
  });

  it("rejects an anon key that cannot be a header value", () => {
    expect(() => makeClient({ supabaseAnonKey: "abc\r\ndef" })).toThrow(ConfigError);
  });
});

describe("project tools", () => {
  it("are listed, read-only, and the articles tools are absent without an API key", async () => {
    const mcp = await connect();
    const { tools } = await mcp.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "get_ai_visibility",
        "get_ai_visibility_response",
        "get_ai_visibility_suggestions",
        "get_backlink_report",
        "get_calendar",
        "get_content_plan",
        "get_keyword_bookmarks",
        "get_keyword_discovery_run",
        "get_keyword_discovery_runs",
        "get_keyword_serp",
        "get_listing",
        "get_next_actions",
        "get_ranked_keywords_report",
      ].sort(),
    );
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
  });

  it("show both sets when both credentials are configured", async () => {
    const mcp = await connect({ articles: true });
    const names = (await mcp.listTools()).tools.map((t) => t.name);
    expect(names).toContain("list_articles");
    expect(names).toContain("get_content_plan");
  });

  it("call the project path with the given project_id", async () => {
    const mcp = await connect();
    const r = await mcp.callTool({ name: "get_content_plan", arguments: { project_id: PID } });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(text(r)).echoed).toBe(`/api/projects/${PID}/content-plan`);
  });

  it("map every tool to its endpoint", async () => {
    const mcp = await connect({ defaultProjectId: PID });
    const expected: Record<string, string> = {
      get_content_plan: "content-plan",
      get_calendar: "calendar",
      get_next_actions: "next-actions",
      get_ai_visibility: "ai-visibility",
      get_keyword_discovery_runs: "keyword-discovery/runs",
      get_keyword_bookmarks: "keyword-discovery/bookmarks",
      get_ranked_keywords_report: "ranked-keywords/report",
      get_listing: "listing",
      get_backlink_report: "backlink-report",
    };
    for (const [name, path] of Object.entries(expected)) {
      b.dashCalls = [];
      const r = await mcp.callTool({ name, arguments: {} });
      expect(r.isError, name).toBeFalsy();
      expect(b.dashCalls[0]?.url, name).toBe(`/api/projects/${PID}/${path}`);
      expect(b.dashCalls[0]?.method, name).toBe("GET");
    }
  });

  it("map the tools that take ids to their endpoints", async () => {
    const mcp = await connect({ defaultProjectId: PID });
    const cases: [string, Record<string, unknown>, string][] = [
      ["get_keyword_discovery_run", { run_id: "run-1" }, "keyword-discovery/runs/run-1"],
      ["get_keyword_serp", { run_id: "run-1", keyword_id: "kw-9" }, "keyword-discovery/runs/run-1/keywords/kw-9/serp"],
      ["get_ai_visibility_suggestions", {}, "ai-visibility/suggestions"],
      ["get_ai_visibility_response", { judgement_id: "j-3" }, "ai-visibility/response/j-3"],
    ];
    for (const [name, args, path] of cases) {
      b.dashCalls = [];
      const r = await mcp.callTool({ name, arguments: args });
      expect(r.isError, name).toBeFalsy();
      expect(b.dashCalls[0]?.url, name).toBe(`/api/projects/${PID}/${path}`);
      expect(b.dashCalls[0]?.method, name).toBe("GET");
    }
  });

  it("refuse run, keyword and judgement ids that could change the path", async () => {
    const mcp = await connect({ defaultProjectId: PID });
    for (const [name, args] of [
      ["get_keyword_discovery_run", { run_id: "../x" }],
      ["get_keyword_serp", { run_id: "r", keyword_id: "a/b" }],
      ["get_ai_visibility_response", { judgement_id: ".." }],
    ] as [string, Record<string, unknown>][]) {
      const r = await mcp.callTool({ name, arguments: args }).catch((e: unknown) => e);
      expect(r instanceof Error || (r as CallToolResult).isError === true, name).toBe(true);
    }
    expect(b.dashCalls).toHaveLength(0);
  });

  it("drop raw_json from search results unless include_raw_json is true", async () => {
    b.dashResponder = () => ({
      status: 200,
      body: { keyword: "k", results: [{ position: 1, url: "https://a.test/", raw_json: { big: "x".repeat(100) } }] },
    });
    const mcp = await connect({ defaultProjectId: PID });
    const lean = JSON.parse(text(await mcp.callTool({ name: "get_keyword_serp", arguments: { run_id: "r", keyword_id: "k" } })));
    expect(lean).toEqual({ keyword: "k", results: [{ position: 1, url: "https://a.test/" }] });
    const full = JSON.parse(text(await mcp.callTool({ name: "get_keyword_serp", arguments: { run_id: "r", keyword_id: "k", include_raw_json: true } })));
    expect(full.results[0].raw_json).toEqual({ big: "x".repeat(100) });
  });

  it("use RANKSCORE_PROJECT_ID when project_id is missing, and say so when neither is set", async () => {
    const withDefault = await connect({ defaultProjectId: PID });
    await withDefault.callTool({ name: "get_calendar", arguments: {} });
    expect(b.dashCalls[0]?.url).toBe(`/api/projects/${PID}/calendar`);

    const without = await connect();
    const r = await without.callTool({ name: "get_calendar", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("project_id is required");
  });

  it("reject a project_id that is not a UUID, so it cannot change the path", async () => {
    const mcp = await connect();
    const r = await mcp.callTool({ name: "get_calendar", arguments: { project_id: "../../admin" } }).catch((e: unknown) => e);
    expect(r instanceof Error || (r as CallToolResult).isError === true).toBe(true);
    expect(b.dashCalls).toHaveLength(0);
    expect(b.tokenCalls).toHaveLength(0);
  });

  it("turn a 404 into a tool error", async () => {
    b.dashResponder = () => ({ status: 404, body: { error: "Project not found" } });
    const mcp = await connect({ defaultProjectId: PID });
    const r = await mcp.callTool({ name: "get_listing", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("HTTP 404");
  });

  it("cut backlink lists to max_rows and report what was left out", async () => {
    b.dashResponder = () => ({
      status: 200,
      body: {
        referringDomains: Array.from({ length: 278 }, (_, i) => ({ domain: `d${i}.test` })),
        backlinks: Array.from({ length: 1000 }, (_, i) => ({ url_from: `https://x/${i}` })),
        total: 1000,
      },
    });
    const mcp = await connect({ defaultProjectId: PID });
    const out = JSON.parse(text(await mcp.callTool({ name: "get_backlink_report", arguments: { max_rows: 5 } })));
    expect(out.referringDomains).toHaveLength(5);
    expect(out.backlinks).toHaveLength(5);
    expect(out.total).toBe(1000);
    expect(out._truncated).toEqual({ referringDomains: { shown: 5, total: 278 }, backlinks: { shown: 5, total: 1000 } });
    const small = JSON.parse(text(await mcp.callTool({ name: "get_backlink_report", arguments: { max_rows: 1000 } })));
    expect(small.backlinks).toHaveLength(1000);
    expect(small).not.toHaveProperty("_truncated");
  });

  it("drop raw_output from AI visibility judgements unless include_raw_output is true", async () => {
    b.dashResponder = () => ({
      status: 200,
      body: {
        config: { brand_name: "B" },
        queries: [{ id: "q1" }],
        latestJudgements: [
          { id: "j1", mentioned: true, raw_output: "long judge text" },
          { id: "j2", mentioned: false, raw_output: "more text" },
        ],
      },
    });
    const mcp = await connect({ defaultProjectId: PID });
    const lean = JSON.parse(text(await mcp.callTool({ name: "get_ai_visibility", arguments: {} })));
    expect(lean.latestJudgements).toEqual([
      { id: "j1", mentioned: true },
      { id: "j2", mentioned: false },
    ]);
    expect(lean.config).toEqual({ brand_name: "B" });
    expect(lean.queries).toEqual([{ id: "q1" }]);
    const full = JSON.parse(text(await mcp.callTool({ name: "get_ai_visibility", arguments: { include_raw_output: true } })));
    expect(full.latestJudgements[0].raw_output).toBe("long judge text");
  });

  it("return compact JSON", async () => {
    const mcp = await connect({ defaultProjectId: PID });
    expect(text(await mcp.callTool({ name: "get_calendar", arguments: {} }))).not.toContain("\n");
  });

  it("never put the password in a tool result", async () => {
    b.echoCredentials = true;
    const mcp = await connect({ client: makeClient({ password: "another-wrong-pw" }), defaultProjectId: PID });
    const r = await mcp.callTool({ name: "get_calendar", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).not.toContain("another-wrong-pw");
    expect(text(r)).not.toContain(EMAIL);
  });
});

describe("stdio entry point with login credentials", () => {
  const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

  function credentialsFile(content: string) {
    const dir = mkdtempSync(join(tmpdir(), "rsmcp-"));
    const file = join(dir, "creds");
    writeFileSync(file, content, { mode: 0o600 });
    return { dir, file };
  }

  it("serves project tools using a credentials file", async () => {
    const { dir, file } = credentialsFile(`\n${EMAIL}\n${PASSWORD}\n`);
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: {
        RANKSCORE_CREDENTIALS_FILE: file,
        RANKSCORE_PROJECT_ID: PID,
        RANKSCORE_DASHBOARD_ORIGIN: b.origin,
        RANKSCORE_SUPABASE_URL: b.supabaseUrl,
        RANKSCORE_SUPABASE_ANON_KEY: ANON,
      },
      stderr: "pipe",
    });
    const mcp = new Client({ name: "test", version: "0" });
    await mcp.connect(transport);
    try {
      const names = (await mcp.listTools()).tools.map((t) => t.name);
      expect(names).toContain("get_content_plan");
      expect(names).not.toContain("list_articles");
      expect(names).not.toContain("generate_article"); // writes are off by default
      const r = await mcp.callTool({ name: "get_content_plan", arguments: {} });
      expect(r.isError).toBeFalsy();
      expect(JSON.parse(text(r)).echoed).toBe(`/api/projects/${PID}/content-plan`);
      expect(b.tokenCalls[0]?.body).toMatchObject({ email: EMAIL, password: PASSWORD });
    } finally {
      await mcp.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("exits 1 with no stack trace and no secret when a URL setting is bad", () => {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (k.startsWith("RANKSCORE_")) delete env[k];
    for (const bad of ["http://example.com", "https://user:HUNTER2@bad host", "not a url"]) {
      const r = spawnSync(process.execPath, [entry], {
        env: { ...env, RANKSCORE_EMAIL: EMAIL, RANKSCORE_PASSWORD: PASSWORD, RANKSCORE_SUPABASE_URL: bad },
        encoding: "utf8",
        timeout: 15_000,
      });
      expect(r.status, bad).toBe(1);
      expect(r.stderr, bad).toContain("RANKSCORE_SUPABASE_URL");
      expect(r.stderr, bad).not.toContain("HUNTER2");
      expect(r.stderr, bad).not.toContain(PASSWORD);
      expect(r.stderr, bad).not.toContain("    at "); // no stack trace
      expect(r.stdout, bad).toBe("");
    }
  });

  it("exits 1 when RANKSCORE_API_BASE is plain http to a remote host", () => {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (k.startsWith("RANKSCORE_")) delete env[k];
    const r = spawnSync(process.execPath, [entry], { env: { ...env, RANKSCORE_API_KEY: "k", RANKSCORE_API_BASE: "http://example.com/v1" }, encoding: "utf8", timeout: 15_000 });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("RANKSCORE_API_BASE must use https");
  });
});
