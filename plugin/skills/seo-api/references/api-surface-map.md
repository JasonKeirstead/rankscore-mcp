# RankScore API surface map

Which surface and which tool for an integration goal. Tool names, arguments and returned fields come from the plugin's tool catalog, [`references/rankscore-tools.md`](../../../references/rankscore-tools.md). If this file and the catalog disagree, the catalog wins.

## Two surfaces

| Surface | Auth | Status | Who calls it | Covers |
|---|---|---|---|---|
| **Integrations API**, base `https://dashboard.rankscore.co/api/integrations/v1` | `X-API-Key` header | Documented | Your own code, or the MCP tools `list_articles` / `get_article` | Completed articles of the project the key belongs to |
| **Dashboard API** (the dashboard's `/api/projects` endpoints) | Account email and password (a dashboard login session) | Undocumented. Can change without notice. | Only this plugin's MCP server: the project `get_*` tools and the write tools | Content plan, calendar, recommendations, keyword discovery, rankings, backlinks, AI visibility, site health, local listing |

**Rule:** user code calls only the Integrations API. For anything on the dashboard surface, the recipe is an MCP tool-call sequence that an agent session runs. Do not write code that signs in with the account password or calls the `/api/projects` endpoints directly:

- it puts the account password into scripts, CI and logs;
- it skips the plugin's write safeguards (explicit yes per call, quota shown first);
- it breaks without warning when the dashboard changes, because those endpoints have no documentation or version.

## Integrations API endpoints

| Endpoint | Query | Returns | MCP equivalent |
|---|---|---|---|
| `GET /articles` | `limit` 1-500, `offset` | Summaries of **completed** articles, **newest first**: `id, title, slug, hero_image_url, language_code, meta_description, excerpt, project_url, created_at, keyword, keywords`. **No body.** | `list_articles` (adds `count`, `has_more`, `next_offset`; default `limit` 20) |
| `GET /articles/:id` | none | The same fields plus the body (`content_markdown`, `content_html`) | `get_article` (`format`: `markdown` default, `html`, `both`) |

Always pass `limit` explicitly in code. A page with fewer than `limit` items is the last page. The MCP tool sets `has_more` when the page is full, so one extra empty page can come back at the end: that is normal.

| Status | Meaning | What the code does |
|---|---|---|
| 200 | OK | Continue. |
| 401 | Key missing, wrong or revoked | Stop. Do not retry. Tell the operator to check the key. |
| 404 | Article still generating, or it belongs to another project (not the key's project) | Skip it. The next run picks it up if it was still generating. |
| 429 | More than 60 requests per minute on this key | Back off and retry (see [rate-limits.md](rate-limits.md)). |
| 5xx, network error | Transient | Back off and retry a few times, then fail the run. |

The documented API has these two read endpoints only. It has no write endpoints, so new articles are found by polling `GET /articles`.

## MCP tool map by goal

Reads cost nothing. Writes and jobs need "Enable write tools" and an explicit yes in chat for each call (see `SKILL.md`, step 7).

| Goal | Read tools | Write / job tools (cost; undo) |
|---|---|---|
| Articles | `list_articles(limit, offset)`, `get_article(id, format)` | `generate_article(topic, target_keyword, word_count, angle_notes)`: article credits, returns `articleId`; no delete tool |
| Content plan | `get_content_plan` | `generate_content_plan(mode, focus_topics, avoid_topics, cluster_count, notes)`: limited per period; `rebuild` replaces the plan, `extend` adds clusters. `set_content_plan_item_status(cluster_index, article_type, supporting_index, status)`: no credits; set it back to undo |
| Calendar | `get_calendar` | `add_calendar_entry(title, target_keyword, scheduled_for)`: article credits on that date; remove in the dashboard |
| Recommendations | `get_next_actions` | `dismiss_next_action(rule_id)`: no credits; cannot be undone |
| Keyword research | `get_keyword_discovery_runs`, `get_keyword_discovery_run(run_id)`, `get_keyword_serp(run_id, keyword_id, include_raw_json)`, `get_keyword_bookmarks` | `start_keyword_discovery_run(seed, min_volume)`: about 5 runs per 24 hours. `toggle_keyword_bookmark(keyword_id)`: toggle again to undo |
| Rankings | `get_ranked_keywords_report` | `add_tracked_keyword(keyword, target_url)`: 409 if already tracked; remove in the dashboard. `create_keyword_group(name)`, `rename_keyword_group`, `add_keywords_to_group`, `remove_keyword_from_group`: undo by the reverse call (group deletion is dashboard only). `check_tracked_keyword_positions()`: quota. `refresh_ranked_keywords_report()`: monthly allowance |
| Backlinks (project domain) | `get_backlink_report(max_rows)` | `refresh_backlink_report()`: small allowance |
| AI visibility | `get_ai_visibility(include_raw_output)`, `get_ai_visibility_response(judgement_id)`, `get_ai_visibility_suggestions` | `set_ai_visibility_config(brand_name, domain, aliases, enabled, queries[], kickoff)`: **replaces** the whole setup; `kickoff: true` uses quota; undo only by sending the saved old setup |
| Site health | none (no pure read tool) | `run_site_health(force_rerun)`: a job tool, so ask first. Without `force_rerun` a recent result comes back from cache (`cached: true`, with `summary`, `fixes[]`, `updated_at`) at no cost; if there is no recent result, the call starts a run. `force_rerun: true` always starts a new audit |
| Local listing | `get_listing` | `generate_listing_description(...)`: returns text only, does not save it; listed with the jobs, cost not stated |

The catalog does not list the argument names of `rename_keyword_group`, `add_keywords_to_group`, `remove_keyword_from_group` and `generate_listing_description`. Read them from the tool's input schema in the tool list before proposing the call. Never guess them.

## ID resolution

Resolve every id before the step that needs it. Record each in `evidence/03-ids-resolved.md`.

| Need | Source |
|---|---|
| `project_id` | The default project from the plugin settings. Otherwise the UUID in the dashboard URL `/dashboard/projects/<id>`, from the user. There is no project-list tool. |
| Project for the Integrations API | None: the key belongs to one project. Another project needs that project's key. |
| Article `id` | `list_articles` / `GET /articles` → `articles[].id`. `generate_article` returns `articleId`; it gives 404 until the article is complete. |
| `run_id` | `get_keyword_discovery_runs` → `runs[].id`, or the `run_id` that `start_keyword_discovery_run` returns |
| `keyword_id` (discovery) | `get_keyword_discovery_run(run_id)` → `keywords[].id` |
| `judgement_id` | `get_ai_visibility` → `latestJudgements[].id` |
| AI visibility setup to keep (`set_ai_visibility_config`) | `get_ai_visibility`, saved to `evidence/ai-visibility-before.json`. Copy `config.brand_name`, `config.domain`, `config.aliases` and `config.enabled` unchanged unless the user asked to change them. Send every kept query as `{query_text, source}` with its original `source`. A new query gets `source: "suggested"` if it came from `get_ai_visibility_suggestions`, else `"manual"`. At most 50 queries. Read the tool's input schema before proposing the call: a left-out `aliases` becomes `[]`, `enabled` becomes `true` and `source` becomes `"manual"`. |
| `rule_id` | `get_next_actions` → `actions[].ruleId` |
| `cluster_index`, `supporting_index` | Position in `get_content_plan` → `plan.clusters[]` and `supporting_articles[]`. Check the tool's input schema for whether counting starts at 0. |
| Keyword group and tracked-keyword ids | `get_ranked_keywords_report` → `snapshot.groups[]` and `snapshot.pinnedRows[].tracked_keyword_id` |
| `target_url` | A URL on the project's own site, for example a `url` from `get_ranked_keywords_report` rows |

## Decision tree

```
"Get RankScore articles into my CMS, site, warehouse or app"
  -> Integrations API from your own code (integration-patterns.md, Pattern 1)

"Automate content production"
  -> MCP: get_content_plan -> generate_content_plan (extend) / add_calendar_entry / generate_article
     (writes, article credits) -> Pattern 1 to move finished articles into the CMS

"Track rankings for my pages"
  -> MCP: add_tracked_keyword -> create_keyword_group / add_keywords_to_group
     -> check_tracked_keyword_positions -> get_ranked_keywords_report (until last_checked_at is new)

"Keyword research"
  -> MCP: start_keyword_discovery_run -> get_keyword_discovery_runs (until the run is complete)
     -> get_keyword_discovery_run -> get_keyword_serp

"AI answer visibility"
  -> MCP: get_ai_visibility -> set_ai_visibility_config -> get_ai_visibility_response

"Site audit or audit alerts"           -> MCP: run_site_health (interactive only: a yes per call)
"Backlinks of my domain"               -> MCP: get_backlink_report (max_rows: 1000)
"Local listing text"                   -> MCP: get_listing -> generate_listing_description

"Research a domain I do not own, competitor keywords or backlinks,
 search volume for any keyword, SERPs for any keyword"
  -> Not in RankScore. A WebSearch / WebFetch step can stand in inside an agent
     recipe, labelled as web data. There is no API for it.

"Call the dashboard /api/projects endpoints from my code"
  -> No. Use the MCP tools from an agent session.

"Delete or publish articles, create or list projects, edit the listing or calendar"
  -> Not available as tools. Dashboard only (publishing to your CMS is your code).
```

## Tool names in Claude Code

Skills use the bare names above. As a plugin tool the full name is `mcp__plugin_rankscore_rankscore__<tool>`. A server added by hand as `rankscore` gives `mcp__rankscore__<tool>`. Write the full name in `code/mcp-calls.md` when the recipe will run in another agent setup, together with the confirmation rule at the top and the `(write, proposal)` / `(job, proposal)` labels with cost and undo (see `SKILL.md`, step 7).
