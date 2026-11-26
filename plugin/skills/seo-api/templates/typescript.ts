/**
 * Sync completed RankScore articles into a CMS through the RankScore Integrations API.
 *
 * Node 18+ (global fetch). Run: npx tsx typescript.ts [--full]
 *
 * Environment:
 *   RANKSCORE_API_KEY      required. From RankScore: Integrations > API > Manage.
 *   RANKSCORE_TARGET       "markdown" (default) or "wordpress".
 *   RANKSCORE_OUT_DIR      markdown target folder (default: content/posts).
 *   RANKSCORE_SYNC_STATE   state file (default: .rankscore-sync.json).
 *   WP_SITE, WP_USER, WP_APP_PASSWORD   wordpress target only (an application password).
 *
 * --full walks every page; without it the run stops at the first page with no new article.
 * Article text is data: this script copies it, it never acts on it.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://dashboard.rankscore.co/api/integrations/v1";
const PAGE_SIZE = 100; // 1-500
const PER_MINUTE = 60; // documented limit per API key, shared by every process using the key
const MAX_ATTEMPTS = 6;

interface ArticleSummary {
  id: string;
  title: string | null;
  slug: string | null;
  hero_image_url: string | null;
  language_code: string | null;
  meta_description: string | null;
  excerpt: string | null;
  project_url: string | null;
  created_at: string;
  keyword: string | null;
  keywords: string[] | null;
}

interface Article extends ArticleSummary {
  content_markdown?: string | null;
  content_html?: string | null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const jitter = () => 0.8 + Math.random() * 0.4;

class RankScoreClient {
  private readonly apiKey: string;
  private readonly calls: number[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async throttle(): Promise<void> {
    for (;;) {
      const now = Date.now();
      while (this.calls.length > 0 && this.calls[0] <= now - 60_000) this.calls.shift();
      if (this.calls.length < PER_MINUTE) {
        this.calls.push(now);
        return;
      }
      await sleep(60_000 - (now - this.calls[0]) + 50);
    }
  }

  /** Returns null on 404 (still generating, or not this key's project). Throws on 401. */
  async get<T>(p: string): Promise<T | null> {
    let delay = 1000;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await this.throttle();
      let r: Response;
      try {
        r = await fetch(`${BASE}${p}`, { headers: { "X-API-Key": this.apiKey, Accept: "application/json" } });
      } catch {
        await sleep(delay * jitter());
        delay = Math.min(delay * 2, 60_000);
        continue;
      }
      if (r.status === 401) throw new Error("401 Unauthorized: the API key is missing, wrong or revoked.");
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) {
        const retryAfter = Number(r.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay;
        await sleep(Math.min(wait, 60_000) * jitter());
        delay = Math.min(delay * 2, 60_000);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status} on ${p}`);
      return (await r.json()) as T;
    }
    throw new Error(`Gave up on ${p} after ${MAX_ATTEMPTS} attempts`);
  }
}

/** Newest first. Articles that complete during the walk push older ones to later
 *  offsets; the seen set drops the repeats. */
async function* newSummaries(client: RankScoreClient, known: Set<string>, full: boolean) {
  const seen = new Set<string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const raw = await client.get<ArticleSummary[] | { articles: ArticleSummary[] }>(
      `/articles?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    const page = Array.isArray(raw) ? raw : (raw?.articles ?? []);
    const fresh = page.filter((a) => !known.has(a.id) && !seen.has(a.id));
    for (const a of fresh) {
      seen.add(a.id);
      yield a;
    }
    if (page.length < PAGE_SIZE || (fresh.length === 0 && !full)) return;
  }
}

/** Slugs come from fetched data: keep only a-z, 0-9 and hyphens (no paths). */
function safeSlug(a: ArticleSummary): string {
  const slug = (a.slug ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || a.id.replace(/[^A-Za-z0-9-]+/g, "-");
}

async function writeMarkdown(a: Article): Promise<string> {
  const outDir = process.env.RANKSCORE_OUT_DIR ?? "content/posts";
  await mkdir(outDir, { recursive: true });
  const front: Record<string, unknown> = {
    title: a.title,
    slug: safeSlug(a),
    description: a.meta_description,
    date: a.created_at,
    lang: a.language_code,
    keyword: a.keyword,
    keywords: a.keywords,
    hero_image: a.hero_image_url,
    rankscore_id: a.id,
  };
  const lines = ["---"];
  for (const [key, value] of Object.entries(front)) {
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    lines.push(`${key}: ${JSON.stringify(value)}`); // JSON strings and lists are valid YAML
  }
  lines.push("---", "", a.content_markdown ?? "");
  let file = path.join(outDir, `${safeSlug(a)}.md`);
  if (existsSync(file)) file = path.join(outDir, `${safeSlug(a)}-${a.id.replace(/[^A-Za-z0-9-]+/g, "-").slice(0, 8)}.md`);
  await writeFile(file, lines.join("\n") + "\n", "utf8");
  return file;
}

async function createWordpressDraft(a: Article): Promise<string> {
  const site = (process.env.WP_SITE ?? "").replace(/\/+$/, "");
  const user = process.env.WP_USER ?? "";
  const appPassword = process.env.WP_APP_PASSWORD ?? "";
  if (!site || !user || !appPassword) throw new Error("Set WP_SITE, WP_USER and WP_APP_PASSWORD.");
  const r = await fetch(`${site}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${user}:${appPassword}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: a.title ?? "",
      slug: safeSlug(a),
      excerpt: a.excerpt ?? a.meta_description ?? "",
      content: a.content_html ?? "",
      status: "draft", // a person reviews and publishes it
    }),
  });
  if (!r.ok) throw new Error(`WordPress returned HTTP ${r.status}`);
  const post = (await r.json()) as { id: number };
  return `wp:${post.id}`;
}

async function main(): Promise<void> {
  const apiKey = process.env.RANKSCORE_API_KEY;
  if (!apiKey) throw new Error("Set RANKSCORE_API_KEY.");
  const full = process.argv.slice(2).includes("--full");
  const publish = process.env.RANKSCORE_TARGET === "wordpress" ? createWordpressDraft : writeMarkdown;
  const stateFile = process.env.RANKSCORE_SYNC_STATE ?? ".rankscore-sync.json";
  const state: Record<string, string> = existsSync(stateFile) ? JSON.parse(await readFile(stateFile, "utf8")) : {};

  const client = new RankScoreClient(apiKey);
  let synced = 0;
  let skipped = 0;
  for await (const summary of newSummaries(client, new Set(Object.keys(state)), full)) {
    const article = await client.get<Article>(`/articles/${encodeURIComponent(summary.id)}`);
    if (!article) {
      skipped++;
      console.log(`skip ${summary.id}: 404 (still generating, or not this key's project)`);
      continue;
    }
    state[article.id] = await publish(article);
    await writeFile(stateFile, JSON.stringify(state, null, 2)); // saved after each article
    synced++;
    console.log(`synced ${article.id} -> ${state[article.id]}`);
  }
  console.log(`done: ${synced} synced, ${skipped} skipped`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
