import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RankScoreClient } from "../src/client.js";
import { createServer } from "../src/server.js";

const KEY = "test-key-123";
const ARTICLE_ID = "11111111-2222-3333-4444-555555555555";
const FULL_ARTICLE = {
  id: ARTICLE_ID,
  title: "Hello",
  slug: "hello",
  keyword: "greeting",
  keywords: ["greeting", "hi"],
  meta_description: "A hello article",
  hero_image_url: "https://example.com/hero.png",
  content_html: "<p>Hello</p>",
  content_markdown: "Hello",
};

interface Seen {
  method?: string;
  url?: string;
  headers: IncomingMessage["headers"];
}

let http: Server;
let baseUrl: string;
let seen: Seen[];
let responder: (req: IncomingMessage, n: number) => { status: number; body?: unknown; headers?: Record<string, string> };

beforeAll(async () => {
  http = createHttpServer((req, res) => {
    seen.push({ method: req.method, url: req.url, headers: req.headers });
    const r = responder(req, seen.length);
    res.writeHead(r.status, { "content-type": "application/json", ...r.headers });
    res.end(r.body === undefined ? "" : typeof r.body === "string" ? r.body : JSON.stringify(r.body));
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}/api/integrations/v1`;
});

afterAll(() => new Promise<void>((resolve) => http.close(() => resolve())));

beforeEach(() => {
  seen = [];
  responder = (req) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (req.headers["x-api-key"] !== KEY) return { status: 401, body: { error: "Invalid or revoked API key." } };
    if (url.pathname.endsWith("/articles")) return { status: 200, body: [{ id: "a" }, { id: "b" }] };
    if (url.pathname.endsWith(`/articles/${ARTICLE_ID}`)) return { status: 200, body: FULL_ARTICLE };
    return { status: 404, body: { error: "Article not found." } };
  };
});

async function connect(apiKey = KEY, opts: { maxRetries?: number } = {}) {
  const client = new RankScoreClient({ apiKey, baseUrl, retryBaseMs: 1, ...opts });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const server = createServer({ articles: client });
  const mcp = new Client({ name: "test", version: "0" });
  await Promise.all([server.connect(serverT), mcp.connect(clientT)]);
  return mcp;
}

const text = (r: unknown) => ((r as CallToolResult).content[0] as { text: string }).text;

describe("tools", () => {
  it("lists exactly the two read-only tools", async () => {
    const mcp = await connect();
    const { tools } = await mcp.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_article", "list_articles"]);
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
  });

  it("list_articles sends auth header, defaults and paging hints", async () => {
    const mcp = await connect();
    const r = await mcp.callTool({ name: "list_articles", arguments: {} });
    expect(r.isError).toBeFalsy();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.method).toBe("GET");
    expect(seen[0]?.url).toBe("/api/integrations/v1/articles?limit=20&offset=0");
    expect(seen[0]?.headers["x-api-key"]).toBe(KEY);
    const out = JSON.parse(text(r));
    expect(out).toMatchObject({ count: 2, limit: 20, offset: 0, has_more: false, next_offset: null });
    expect(out.articles).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("list_articles reports has_more and next_offset on a full page", async () => {
    const mcp = await connect();
    const out = JSON.parse(text(await mcp.callTool({ name: "list_articles", arguments: { limit: 2, offset: 4 } })));
    expect(seen[0]?.url).toContain("limit=2&offset=4");
    expect(out).toMatchObject({ has_more: true, next_offset: 6 });
  });

  it("list_articles rejects limit above 500 and negative offset", async () => {
    const mcp = await connect();
    for (const args of [{ limit: 501 }, { limit: 0 }, { offset: -1 }, { limit: 1.5 }]) {
      const r = await mcp.callTool({ name: "list_articles", arguments: args }).catch((e: unknown) => e);
      const failed = r instanceof Error || (r as CallToolResult).isError === true;
      expect(failed).toBe(true);
    }
    expect(seen).toHaveLength(0);
  });

  it("get_article returns markdown only by default", async () => {
    const mcp = await connect();
    const out = JSON.parse(text(await mcp.callTool({ name: "get_article", arguments: { id: ARTICLE_ID } })));
    expect(out.content_markdown).toBe("Hello");
    expect(out).not.toHaveProperty("content_html");
    expect(out.slug).toBe("hello");
    expect(seen[0]?.url).toBe(`/api/integrations/v1/articles/${ARTICLE_ID}`);
  });

  it("get_article honours format html and both", async () => {
    const mcp = await connect();
    const html = JSON.parse(text(await mcp.callTool({ name: "get_article", arguments: { id: ARTICLE_ID, format: "html" } })));
    expect(html.content_html).toBe("<p>Hello</p>");
    expect(html).not.toHaveProperty("content_markdown");
    const both = JSON.parse(text(await mcp.callTool({ name: "get_article", arguments: { id: ARTICLE_ID, format: "both" } })));
    expect(both).toMatchObject({ content_html: "<p>Hello</p>", content_markdown: "Hello" });
  });

  it("get_article refuses ids that could change the path, and sends no request", async () => {
    const mcp = await connect();
    for (const id of ["../articles?x=1", "..", ".", "a/b", "a%2Fb", "a b"]) {
      const r = await mcp.callTool({ name: "get_article", arguments: { id } }).catch((e: unknown) => e);
      expect(r instanceof Error || (r as CallToolResult).isError === true, id).toBe(true);
    }
    expect(seen).toHaveLength(0);
  });

  it("get_article accepts a UUID", async () => {
    const mcp = await connect();
    const r = await mcp.callTool({ name: "get_article", arguments: { id: ARTICLE_ID } });
    expect(r.isError).toBeFalsy();
    expect(seen[0]?.url).toBe(`/api/integrations/v1/articles/${ARTICLE_ID}`);
  });
});

describe("errors", () => {
  it("401 becomes a tool error with the key hint and server message", async () => {
    const mcp = await connect("wrong-key");
    const r = await mcp.callTool({ name: "list_articles", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("HTTP 401");
    expect(text(r)).toContain("RANKSCORE_API_KEY");
    expect(text(r)).toContain("Invalid or revoked API key.");
  });

  it("404 becomes a tool error with the generating hint", async () => {
    const mcp = await connect();
    const r = await mcp.callTool({ name: "get_article", arguments: { id: "missing" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("HTTP 404");
    expect(text(r)).toContain("still be generating");
  });

  it("retries 429 and then succeeds", async () => {
    responder = (_req, n) =>
      n < 3 ? { status: 429, body: { error: "slow down" }, headers: { "retry-after": "0" } } : { status: 200, body: [] };
    const mcp = await connect();
    const r = await mcp.callTool({ name: "list_articles", arguments: {} });
    expect(r.isError).toBeFalsy();
    expect(seen).toHaveLength(3);
  });

  it("gives up on 429 after maxRetries", async () => {
    responder = () => ({ status: 429, body: { error: "slow down" }, headers: { "retry-after": "0" } });
    const mcp = await connect(KEY, { maxRetries: 1 });
    const r = await mcp.callTool({ name: "list_articles", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("HTTP 429");
    expect(seen).toHaveLength(2);
  });

  it("5xx with a non-JSON body still yields a readable error", async () => {
    responder = () => ({ status: 502, body: "<html>Bad gateway</html>", headers: { "content-type": "text/html" } });
    const mcp = await connect();
    const r = await mcp.callTool({ name: "list_articles", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("HTTP 502");
  });

  it("a 200 with a non-JSON body is reported, not thrown", async () => {
    responder = () => ({ status: 200, body: "not json" });
    const mcp = await connect();
    const r = await mcp.callTool({ name: "get_article", arguments: { id: ARTICLE_ID } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("not valid JSON");
  });

  it("a network failure is reported, not thrown", async () => {
    const client = new RankScoreClient({ apiKey: KEY, baseUrl: "http://127.0.0.1:1/api", timeoutMs: 2000 });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: "test", version: "0" });
    await Promise.all([createServer({ articles: client }).connect(serverT), mcp.connect(clientT)]);
    const r = await mcp.callTool({ name: "list_articles", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("Request to RankScore failed");
  });
});

describe("stdio entry point", () => {
  const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

  it("exits 1 with a clear message when no credentials are set", () => {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (k.startsWith("RANKSCORE_")) delete env[k];
    const r = spawnSync(process.execPath, [entry], { env, encoding: "utf8", timeout: 15_000 });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("No RankScore credentials");
    expect(r.stdout).toBe("");
  });

  it("the plugin bundle (plugin/server/index.mjs) serves the same tools, with no package.json next to it", async () => {
    const bundle = fileURLToPath(new URL("../plugin/server/index.mjs", import.meta.url));
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [bundle],
      env: { RANKSCORE_API_KEY: KEY, RANKSCORE_API_BASE: baseUrl },
      stderr: "pipe",
    });
    const mcp = new Client({ name: "test", version: "0" });
    await mcp.connect(transport);
    try {
      const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
      expect(mcp.getServerVersion()?.version).toBe(pkg.version);
      const { tools } = await mcp.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(["get_article", "list_articles"]);
      const out = JSON.parse(text(await mcp.callTool({ name: "list_articles", arguments: { limit: 5 } })));
      expect(out.count).toBe(2);
    } finally {
      await mcp.close();
    }
  });

  it("serves both tools over stdio against RANKSCORE_API_BASE", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: { RANKSCORE_API_KEY: KEY, RANKSCORE_API_BASE: `${baseUrl}/` },
      stderr: "pipe",
    });
    const mcp = new Client({ name: "test", version: "0" });
    await mcp.connect(transport);
    try {
      const { tools } = await mcp.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(["get_article", "list_articles"]);
      const out = JSON.parse(text(await mcp.callTool({ name: "list_articles", arguments: { limit: 5 } })));
      expect(out.count).toBe(2);
      expect(seen[0]?.url).toBe("/api/integrations/v1/articles?limit=5&offset=0");
      expect(seen[0]?.headers["x-api-key"]).toBe(KEY);
    } finally {
      await mcp.close();
    }
  });
});
