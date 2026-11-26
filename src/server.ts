import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RankScoreClient } from "./client.js";
import type { DashboardClient } from "./dashboard.js";
import { fail, idSchema, ok, projectIdSchema, projectResolver } from "./tool-helpers.js";
import { registerWriteTools } from "./write-tools.js";

// The plugin bundle has the version built in (scripts/bundle.mjs), because it ships without package.json.
const version =
  process.env.RANKSCORE_MCP_BUILD_VERSION ??
  (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: true } as const;

export interface ServerDeps {
  /** Documented API-key API: enables list_articles and get_article. */
  articles?: RankScoreClient;
  /** Dashboard login session: enables the project tools. */
  dashboard?: DashboardClient;
  /** Project used when a project tool call gives no project_id. */
  defaultProjectId?: string;
  /** Also register the tools that change data or start jobs (needs dashboard). Default false. */
  enableWrites?: boolean;
}

interface ProjectToolSpec {
  name: string;
  title: string;
  description: string;
  /** Path after /api/projects/{id}/ */
  path: string;
}

/** Read-only dashboard endpoints. All of them were called with GET and returned JSON. */
const PROJECT_TOOLS: ProjectToolSpec[] = [
  {
    name: "get_content_plan",
    title: "Get content plan",
    description: "Content plan (topic clusters, each with a pillar and supporting article topics) for a RankScore project.",
    path: "content-plan",
  },
  {
    name: "get_calendar",
    title: "Get content calendar",
    description: "Content calendar entries (scheduled articles) for a RankScore project.",
    path: "calendar",
  },
  {
    name: "get_next_actions",
    title: "Get next actions",
    description: "The dashboard's recommended next actions for a project: ruleId, title, explanation and status.",
    path: "next-actions",
  },
  {
    name: "get_keyword_discovery_runs",
    title: "List keyword discovery runs",
    description: "Keyword discovery runs for a project: id, status, seeds, minimum volume and source.",
    path: "keyword-discovery/runs",
  },
  {
    name: "get_keyword_bookmarks",
    title: "List bookmarked keywords",
    description: "Keywords bookmarked from keyword discovery in a project.",
    path: "keyword-discovery/bookmarks",
  },
  {
    name: "get_ranked_keywords_report",
    title: "Get keyword rankings report",
    description:
      "Keyword rankings snapshot for a project (region, report, pinned rows, groups) and the refresh allowance (remaining, limit, resetAt). Does not start a refresh.",
    path: "ranked-keywords/report",
  },
  {
    name: "get_listing",
    title: "Get business listing",
    description: "Business listing details for a project (name, contact, category, description, status, Localr sync state).",
    path: "listing",
  },
];

const BACKLINK_TOOL = {
  name: "get_backlink_report",
  title: "Get backlink report",
  description:
    "Backlink report for a project: referring domains and backlinks, and the refresh allowance. The report is large, so every top-level list is cut to max_rows items and _truncated says how many were left out.",
  path: "backlink-report",
};

function truncateTopLevelArrays(value: unknown, max: number): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  const truncated: Record<string, { shown: number; total: number }> = {};
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item) && item.length > max) {
      out[key] = item.slice(0, max);
      truncated[key] = { shown: max, total: item.length };
    } else {
      out[key] = item;
    }
  }
  return Object.keys(truncated).length ? { ...out, _truncated: truncated } : out;
}

/** Removes `key` from every object in the top-level list `list`. */
function withoutKey(value: unknown, list: string, key: string): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  const items = data[list];
  if (!Array.isArray(items)) return data;
  return {
    ...data,
    [list]: items.map((item) => {
      if (item === null || typeof item !== "object") return item;
      const { [key]: _dropped, ...rest } = item as Record<string, unknown>;
      return rest;
    }),
  };
}

const withoutRawOutput = (value: unknown) => withoutKey(value, "latestJudgements", "raw_output");

export function createServer(deps: ServerDeps): McpServer {
  const { articles, dashboard } = deps;
  if (!articles && !dashboard) throw new Error("createServer needs an articles client, a dashboard client, or both.");
  const server = new McpServer({ name: "rankscore", version });

  if (articles) registerArticleTools(server, articles);
  if (dashboard) {
    registerProjectTools(server, dashboard, deps.defaultProjectId);
    if (deps.enableWrites) registerWriteTools(server, dashboard, deps.defaultProjectId);
  }

  return server;
}

function registerArticleTools(server: McpServer, client: RankScoreClient): void {
  server.registerTool(
    "list_articles",
    {
      title: "List RankScore articles",
      description:
        "List completed RankScore articles for the project tied to the API key, newest first. " +
        "Returns summaries only (no content_html or content_markdown); call get_article with an article id for full content. " +
        "Page with limit and offset: has_more is true when the page is full, so fetch the next page at next_offset.",
      inputSchema: {
        limit: z.number().int().min(1).max(500).default(20).describe("Articles per page (1-500). Default 20."),
        offset: z.number().int().min(0).default(0).describe("Number of articles to skip. Default 0."),
      },
      annotations: READ_ONLY,
    },
    async ({ limit, offset }) => {
      try {
        const list = await client.listArticles({ limit, offset });
        if (!Array.isArray(list)) return ok(list);
        const hasMore = list.length === limit;
        return ok({
          count: list.length,
          limit,
          offset,
          has_more: hasMore,
          next_offset: hasMore ? offset + limit : null,
          articles: list,
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_article",
    {
      title: "Get a RankScore article",
      description:
        "Fetch one RankScore article by id: title, slug, meta_description, hero_image_url, keyword, keywords and the body. " +
        "A 404 means the article is still generating or belongs to another project. " +
        "The body comes as markdown by default. Use format html or both when you need content_html.",
      inputSchema: {
        id: idSchema("Article id (UUID) from list_articles."),
        format: z
          .enum(["markdown", "html", "both"])
          .default("markdown")
          .describe("Which body to return: content_markdown (default), content_html, or both."),
      },
      annotations: READ_ONLY,
    },
    async ({ id, format }) => {
      try {
        const article = { ...(await client.getArticle(id)) };
        if (format === "markdown") delete article.content_html;
        if (format === "html") delete article.content_markdown;
        return ok(article);
      } catch (err) {
        return fail(err);
      }
    },
  );
}

function registerProjectTools(server: McpServer, dashboard: DashboardClient, defaultProjectId?: string): void {
  const resolveProject = projectResolver(defaultProjectId);
  const fetchProject = (project: string, path: string) =>
    dashboard.get<unknown>(`/api/projects/${encodeURIComponent(project)}/${path}`);

  for (const spec of PROJECT_TOOLS) {
    server.registerTool(
      spec.name,
      {
        title: spec.title,
        description: `${spec.description} Uses the dashboard login, not the API key.`,
        inputSchema: { project_id: projectIdSchema },
        annotations: READ_ONLY,
      },
      async ({ project_id }) => {
        try {
          return ok(await fetchProject(resolveProject(project_id), spec.path));
        } catch (err) {
          return fail(err);
        }
      },
    );
  }

  server.registerTool(
    "get_ai_visibility",
    {
      title: "Get AI visibility",
      description:
        "AI visibility for a project: setup (brand, domain, aliases, enabled), tracked queries, the latest snapshot (score, per-model results, competitors) " +
        "and the latest judgements (mentioned, recommended, position, sentiment, domain cited). " +
        "Each judgement also holds raw_output, the judge model's full text. It is about half the size of the result, so it is left out unless include_raw_output is true. " +
        "Uses the dashboard login, not the API key.",
      inputSchema: {
        project_id: projectIdSchema,
        include_raw_output: z.boolean().default(false).describe("Keep raw_output in each judgement. Default false."),
      },
      annotations: READ_ONLY,
    },
    async ({ project_id, include_raw_output }) => {
      try {
        const data = await fetchProject(resolveProject(project_id), "ai-visibility");
        return ok(include_raw_output ? data : withoutRawOutput(data));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_keyword_discovery_run",
    {
      title: "Get a keyword discovery run",
      description:
        "One keyword discovery run and its keywords: keyword, search_volume, cpc, opportunity_score, serp_weakness_score, difficulty_tier, weak_pages_count, status, bookmarked. " +
        "Run ids are in get_keyword_discovery_runs. Uses the dashboard login, not the API key.",
      inputSchema: { project_id: projectIdSchema, run_id: idSchema("Run id from get_keyword_discovery_runs.") },
      annotations: READ_ONLY,
    },
    async ({ project_id, run_id }) => {
      try {
        return ok(await fetchProject(resolveProject(project_id), `keyword-discovery/runs/${encodeURIComponent(run_id)}`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_keyword_serp",
    {
      title: "Get the search results for a discovered keyword",
      description:
        "Top search results RankScore holds for one keyword of a discovery run: position, url, domain, domain_type, authority_score, weakness_component. " +
        "raw_json (the provider's full result) is left out unless include_raw_json is true. Uses the dashboard login, not the API key.",
      inputSchema: {
        project_id: projectIdSchema,
        run_id: idSchema("Run id from get_keyword_discovery_runs."),
        keyword_id: idSchema("Keyword id from get_keyword_discovery_run."),
        include_raw_json: z.boolean().default(false).describe("Keep raw_json in each result. Default false."),
      },
      annotations: READ_ONLY,
    },
    async ({ project_id, run_id, keyword_id, include_raw_json }) => {
      try {
        const data = await fetchProject(
          resolveProject(project_id),
          `keyword-discovery/runs/${encodeURIComponent(run_id)}/keywords/${encodeURIComponent(keyword_id)}/serp`,
        );
        return ok(include_raw_json ? data : withoutKey(data, "results", "raw_json"));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_ai_visibility_suggestions",
    {
      title: "Get suggested AI visibility queries",
      description: "Queries RankScore suggests tracking for AI visibility: query_text, source_keyword, source. Uses the dashboard login, not the API key.",
      inputSchema: { project_id: projectIdSchema },
      annotations: READ_ONLY,
    },
    async ({ project_id }) => {
      try {
        return ok(await fetchProject(resolveProject(project_id), "ai-visibility/suggestions"));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_ai_visibility_response",
    {
      title: "Get the AI answer behind a judgement",
      description:
        "The full answer an AI model gave for one tracked query: model, response_text, created_at. Judgement ids are in get_ai_visibility (latestJudgements[].id). Uses the dashboard login, not the API key.",
      inputSchema: { project_id: projectIdSchema, judgement_id: idSchema("Judgement id from get_ai_visibility.") },
      annotations: READ_ONLY,
    },
    async ({ project_id, judgement_id }) => {
      try {
        return ok(await fetchProject(resolveProject(project_id), `ai-visibility/response/${encodeURIComponent(judgement_id)}`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    BACKLINK_TOOL.name,
    {
      title: BACKLINK_TOOL.title,
      description: `${BACKLINK_TOOL.description} Uses the dashboard login, not the API key.`,
      inputSchema: {
        project_id: projectIdSchema,
        max_rows: z.number().int().min(1).max(1000).default(50).describe("Items kept per list (1-1000). Default 50."),
      },
      annotations: READ_ONLY,
    },
    async ({ project_id, max_rows }) => {
      try {
        return ok(truncateTopLevelArrays(await fetchProject(resolveProject(project_id), BACKLINK_TOOL.path), max_rows));
      } catch (err) {
        return fail(err);
      }
    },
  );
}
