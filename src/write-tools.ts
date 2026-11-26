import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DashboardClient } from "./dashboard.js";
import { RankScoreError, type Method } from "./http.js";
import { fail, idSchema, ok, projectIdSchema, projectResolver } from "./tool-helpers.js";

type Args = Record<string, any>;

interface WriteSpec {
  name: string;
  title: string;
  description: string;
  input: z.ZodRawShape;
  method: Exclude<Method, "GET">;
  /** Path after /api/projects/{id}/ */
  path: (a: Args) => string;
  body?: (a: Args) => unknown;
  /** Returns a message when the arguments do not add up. Nothing is sent then. */
  check?: (a: Args) => string | undefined;
  /** Doing it twice has the same effect as once. */
  idempotent?: boolean;
  /** Can overwrite or remove data that was there before. */
  destructive?: boolean;
}

const text = (max: number, describe: string) => z.string().min(1).max(max).describe(describe);

/**
 * Tools that change data or start jobs. The request bodies were taken from the dashboard's own
 * JavaScript, not from documentation: the dashboard sends exactly these. Listing edits, calendar
 * edits and every delete or publish call are not included.
 */
const SPECS: WriteSpec[] = [
  // ---- Edits
  {
    name: "add_calendar_entry",
    title: "Schedule an article on the calendar",
    description:
      "Add an article to the content calendar. RankScore generates the article on that date (the dashboard calls this 'Schedule generation'), so it can use article credits.",
    input: {
      title: text(300, "Article title or topic."),
      target_keyword: text(200, "Target keyword."),
      scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").describe("Date to generate the article, YYYY-MM-DD."),
    },
    method: "POST",
    path: () => "calendar",
    body: (a) => ({ title: a.title, target_keyword: a.target_keyword, scheduled_for: a.scheduled_for }),
  },
  {
    name: "set_content_plan_item_status",
    title: "Mark a content plan article as published or not started",
    description:
      "Set the status of one article in the content plan (get_content_plan lists the clusters). " +
      "Use cluster_index (0 = first cluster) and article_type pillar, or supporting with supporting_index (0 = first supporting article).",
    input: {
      cluster_index: z.number().int().min(0).describe("Index of the cluster in plan.clusters, starting at 0."),
      article_type: z.enum(["pillar", "supporting"]).describe("pillar_article of the cluster, or one of its supporting articles."),
      supporting_index: z.number().int().min(0).optional().describe("Required when article_type is supporting."),
      status: z.enum(["not_started", "published"]).describe("New status."),
    },
    method: "PATCH",
    path: () => "content-plan",
    body: (a) => ({
      clusterIndex: a.cluster_index,
      articleType: a.article_type,
      ...(a.article_type === "supporting" ? { supportingIndex: a.supporting_index } : {}),
      status: a.status,
    }),
    check: (a) => (a.article_type === "supporting" && a.supporting_index === undefined ? "supporting_index is required when article_type is supporting." : undefined),
    idempotent: true,
  },
  {
    name: "dismiss_next_action",
    title: "Dismiss a next action",
    description: "Dismiss one recommended next action. Use the ruleId from get_next_actions.",
    input: { rule_id: z.string().regex(/^[A-Za-z0-9_.:-]{1,100}$/, "Use only letters, digits and _ . : -").describe("ruleId of the action.") },
    method: "PATCH",
    path: () => "next-actions",
    body: (a) => ({ ruleId: a.rule_id }),
    idempotent: true,
  },
  {
    name: "toggle_keyword_bookmark",
    title: "Toggle a keyword bookmark",
    description: "Bookmark a discovered keyword, or remove its bookmark if it already has one. It flips the current state.",
    input: { keyword_id: idSchema("Keyword id from a keyword discovery run.") },
    method: "PATCH",
    path: (a) => `keyword-discovery/keywords/${encodeURIComponent(a.keyword_id)}/bookmark`,
  },
  {
    name: "add_tracked_keyword",
    title: "Track a keyword",
    description: "Start tracking a keyword's position for a URL. The URL must be on the project's site (subdomains count). A keyword that is already tracked returns HTTP 409.",
    input: { keyword: text(200, "Keyword to track."), target_url: text(2000, "Page of the project's site that should rank.") },
    method: "POST",
    path: () => "tracked-keywords",
    body: (a) => ({ keyword: a.keyword, target_url: a.target_url }),
  },
  {
    name: "create_keyword_group",
    title: "Create a keyword group",
    description: "Create a group in the keyword rankings report.",
    input: { name: text(100, "Group name.") },
    method: "POST",
    path: () => "ranked-keywords/groups",
    body: (a) => ({ name: a.name }),
  },
  {
    name: "rename_keyword_group",
    title: "Rename a keyword group",
    description: "Rename a group in the keyword rankings report. Group ids are in get_ranked_keywords_report.",
    input: { group_id: idSchema("Group id."), name: text(100, "New name.") },
    method: "PATCH",
    path: (a) => `ranked-keywords/groups/${encodeURIComponent(a.group_id)}`,
    body: (a) => ({ name: a.name }),
    idempotent: true,
  },
  {
    name: "add_keywords_to_group",
    title: "Add keywords to a group",
    description: "Put keywords into a keyword rankings group. A keyword can be in one group, so it moves out of its old group.",
    input: {
      group_id: idSchema("Group id."),
      keywords: z.array(text(200, "Keyword.")).min(1).max(200).describe("Keywords as they appear in the report."),
    },
    method: "POST",
    path: (a) => `ranked-keywords/groups/${encodeURIComponent(a.group_id)}/members`,
    body: (a) => ({ keywords: a.keywords }),
    idempotent: true,
  },
  {
    name: "remove_keyword_from_group",
    title: "Remove a keyword from a group",
    description: "Take one keyword out of a keyword rankings group. The keyword stays in the report.",
    input: { group_id: idSchema("Group id."), keyword: text(200, "Keyword as it appears in the report.") },
    method: "DELETE",
    path: (a) => `ranked-keywords/groups/${encodeURIComponent(a.group_id)}/members`,
    body: (a) => ({ keyword: a.keyword }),
    idempotent: true,
  },
  {
    name: "set_ai_visibility_config",
    title: "Set up AI visibility tracking",
    description:
      "Save the AI visibility setup. The dashboard sends the whole setup every time, so treat this as a replacement: " +
      "call get_ai_visibility first and send every query you want to keep, or the others may be dropped. " +
      "With kickoff true a new AI visibility run starts, which uses quota.",
    input: {
      brand_name: text(200, "Brand name."),
      domain: text(253, "Domain, for example example.com."),
      aliases: z.array(text(200, "Alias.")).max(50).default([]).describe("Other names of the brand."),
      enabled: z.boolean().default(true).describe("Track AI visibility."),
      queries: z
        .array(
          z.object({
            query_text: text(300, "Question or search a customer would ask an AI assistant."),
            source: z.enum(["manual", "suggested"]).default("manual").describe("suggested if RankScore suggested the query, else manual."),
          }),
        )
        .min(1)
        .max(50)
        .describe("The full list of tracked queries."),
      kickoff: z.boolean().default(false).describe("Start a run now. Default false."),
    },
    method: "PUT",
    path: () => "ai-visibility/config",
    body: (a) => ({
      brand_name: a.brand_name.trim(),
      domain: a.domain.trim(),
      aliases: a.aliases,
      enabled: a.enabled,
      queries: a.queries.map((q: Args) => ({ query_text: q.query_text, source: q.source })),
      kickoff: a.kickoff,
    }),
    idempotent: true,
    destructive: true,
  },

  // ---- Jobs
  {
    name: "generate_article",
    title: "Generate an article",
    description:
      "Queue a new article. It is generated in the background and uses article credits. Returns articleId; the article shows up in list_articles when it is done (get_article answers 404 until then).",
    input: {
      topic: text(300, "Topic or working title."),
      target_keyword: text(200, "Target keyword."),
      word_count: z.number().int().min(300).max(5000).default(1500).describe("Length in words. Default 1500."),
      angle_notes: z.string().max(2000).optional().describe("Angle, audience or points to cover."),
    },
    method: "POST",
    path: () => "articles/generate",
    body: (a) => ({ topic: a.topic.trim(), target_keyword: a.target_keyword.trim(), word_count: a.word_count, angle_notes: a.angle_notes?.trim() || null }),
  },
  {
    name: "generate_content_plan",
    title: "Generate the content plan",
    description:
      "Generate topic clusters. Mode rebuild replaces the whole existing plan. Mode extend keeps the clusters that exist and adds new ones. The plan limit is per period, and HTTP 429 says when it resets.",
    input: {
      mode: z.enum(["rebuild", "extend"]).describe("rebuild = fresh plan, extend = keep existing clusters."),
      focus_topics: z.array(text(200, "Topic.")).max(20).optional().describe("Topics to focus on."),
      avoid_topics: z.array(text(200, "Topic.")).max(20).optional().describe("Topics to avoid."),
      cluster_count: z.number().int().min(1).max(20).optional().describe("Number of clusters."),
      notes: z.string().max(2000).optional().describe("Tone, audience or seasonal focus."),
    },
    method: "POST",
    path: () => "content-plan",
    body: (a) => ({
      mode: a.mode,
      ...(a.focus_topics?.length ? { focus_topics: a.focus_topics } : {}),
      ...(a.avoid_topics?.length ? { avoid_topics: a.avoid_topics } : {}),
      ...(a.cluster_count !== undefined ? { cluster_count: a.cluster_count } : {}),
      ...(a.notes?.trim() ? { notes: a.notes.trim() } : {}),
    }),
    destructive: true,
  },
  {
    name: "start_keyword_discovery_run",
    title: "Start a keyword discovery run",
    description:
      "Start a keyword discovery run from one seed keyword. Returns run_id. The dashboard allows a few runs per 24 hours (it shows 5), and HTTP 429 says when the next one is possible. Read the result with get_keyword_discovery_runs.",
    input: {
      seed: text(100, "Seed keyword."),
      min_volume: z.number().int().min(0).default(0).describe("Minimum monthly search volume to keep. 0 keeps all."),
    },
    method: "POST",
    path: () => "keyword-discovery/runs",
    body: (a) => ({ source: "suggestions", seeds: [a.seed.trim()], min_volume: a.min_volume }),
  },
  {
    name: "check_tracked_keyword_positions",
    title: "Check tracked keyword positions",
    description: "Check the current search position of every tracked keyword. This uses quota, and HTTP 429 says when it resets.",
    input: {},
    method: "POST",
    path: () => "tracked-keywords/check-positions",
  },
  {
    name: "refresh_ranked_keywords_report",
    title: "Refresh the keyword rankings report",
    description:
      "Refresh the rankings report. There is a monthly allowance: get_ranked_keywords_report shows refresh.remaining and refresh.limit. The new report is ready after a short while.",
    input: {},
    method: "POST",
    path: () => "ranked-keywords/refresh",
    body: () => ({}),
  },
  {
    name: "refresh_backlink_report",
    title: "Refresh the backlink report",
    description:
      "Refresh the backlink report. The allowance is small: get_backlink_report shows refresh (used, remaining, limit, resetAt). The new report is ready after a short while.",
    input: {},
    method: "POST",
    path: () => "backlink-report/refresh",
    body: () => ({}),
  },
  {
    name: "run_site_health",
    title: "Run a site health audit",
    description:
      "Run the site health audit. Without force_rerun a recent result may come back from cache (cached true). The audit is rate limited, and HTTP 429 says when it resets.",
    input: { force_rerun: z.boolean().default(false).describe("Run again even if a recent result exists.") },
    method: "POST",
    path: () => "site-health",
    body: (a) => ({ force_rerun: a.force_rerun }),
  },
  {
    name: "generate_listing_description",
    title: "Write a business listing description",
    description: "Have RankScore write a description for the business listing. It returns the text and does not save it to the listing.",
    input: {
      business_name: text(200, "Business name."),
      primary_category: text(200, "Primary category."),
      secondary_categories: z.array(text(200, "Category.")).max(10).default([]).describe("Other categories."),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      description: z.string().max(5000).optional().describe("Current description, to improve on."),
    },
    method: "POST",
    path: () => "listing/description/generate",
    body: (a) => ({
      business_name: a.business_name,
      primary_category: a.primary_category,
      secondary_categories: a.secondary_categories,
      city: a.city ?? null,
      state: a.state ?? null,
      description: a.description ?? null,
    }),
    idempotent: true,
  },
];

export const WRITE_TOOL_NAMES = SPECS.map((s) => s.name);

export function registerWriteTools(server: McpServer, dashboard: DashboardClient, defaultProjectId?: string): void {
  const resolveProject = projectResolver(defaultProjectId);
  for (const spec of SPECS) {
    server.registerTool(
      spec.name,
      {
        title: spec.title,
        description: `${spec.description} CHANGES DATA in RankScore, through the dashboard login.`,
        inputSchema: { project_id: projectIdSchema, ...spec.input },
        annotations: {
          readOnlyHint: false,
          destructiveHint: spec.destructive ?? false,
          idempotentHint: spec.idempotent ?? false,
          openWorldHint: true,
        },
      },
      async (args: Args) => {
        try {
          const problem = spec.check?.(args);
          if (problem) throw new RankScoreError(problem);
          const project = resolveProject(args.project_id);
          const result = await dashboard.request<unknown>(
            spec.method,
            `/api/projects/${encodeURIComponent(project)}/${spec.path(args)}`,
            spec.body?.(args),
          );
          return ok(result);
        } catch (err) {
          return fail(err);
        }
      },
    );
  }
}
