# RankScore dashboard endpoints (internal, undocumented)

Found on 2026-11-26 by reading the network calls and JavaScript of `https://dashboard.rankscore.co`. RankScore does not document these endpoints.

## Authentication

All of them use the browser session cookie. The integrations API key does not work on them: `GET` with `X-API-Key` returned `401 {"error":"Unauthorized"}` on every endpoint tested (content-plan, calendar, listing, next-actions, ai-visibility, backlink-report, ranked-keywords/report, keyword-discovery/bookmarks, listing-categories).

Not endpoints (404): `/api/projects` (no project list), `/api/openapi.json`, `/api/docs`, and `/api/integrations/v1/{projects,content-plan,calendar}`.

The only API-key API is `/api/integrations/v1/articles[/:id]`. This is what `rankscore-mcp` uses.

## Dashboard tools (`?tool=`)

`community`, `articles`, `content-plan`, `calendar`, `keyword-discovery`, `ranked-keywords`, `ai-visibility`, `site-health`, `listing-management`, `backlinks`.

## Endpoints

`{pid}` is the project UUID. Verified = I called it with `GET` in the logged-in browser and read the response shape. All other methods are taken from the client code, not called.

### Read (verified GET)

| Path | Response keys |
|---|---|
| `/api/projects/{pid}/listing` | `listing{...business fields, localr_*}`, `defaults` |
| `/api/projects/{pid}/ai-visibility` | `config{brand_name,domain,aliases,enabled}`, `queries[]`, more |
| `/api/projects/{pid}/ai-visibility/config` | `config`, `queries[{query_text,normalized_query,source}]` |
| `/api/projects/{pid}/next-actions` | `actions[{ruleId,title,explanation,action,action_message,status,display_order}]` |
| `/api/projects/{pid}/content-plan` | `plan{clusters[],project_id,generated_at}`, `updated_at` |
| `/api/projects/{pid}/calendar` | `entries[]` |
| `/api/projects/{pid}/keyword-discovery/runs` | `runs[{id,status,min_volume,source,seeds,error,formula_version}]` |
| `/api/projects/{pid}/keyword-discovery/bookmarks` | `bookmarks[]` |
| `/api/projects/{pid}/ranked-keywords/report` | `snapshot{regionLabel,report,pinnedRows,groups}`, `refresh{remaining,limit,resetAt}` |
| `/api/projects/{pid}/backlink-report` | `referringDomains[]` (278 rows), `backlinks[]` (1000 rows), more. Large. |
| `/api/projects/{pid}/droves`, `/gohighlevel`, `/shopify`, `/wix`, `/wordpress` | `integration` (null if not connected), plus blogs, authors, categories or members |
| `/api/projects/{pid}/trustcaptain` | `trustCaptain{projectId,profileId,domain,profileUrl,status}` |
| `/api/listing-categories` | `categories[{slug,name,group}]` (347 rows) |
| `/api/conversations/{id}/messages?limit=50` | chat history for the dashboard assistant |

### More reads (verified GET, 2026-11-26, exposed by the MCP server)

| Path | Response keys |
|---|---|
| `/api/projects/{pid}/keyword-discovery/runs/{runId}` | `run`, `keywords[] {id, keyword, search_volume, cpc, status, serp_weakness_score, opportunity_score, difficulty_tier, weak_pages_count, failure_reason, origin, bookmarked, parent_keyword_id}` |
| `/api/projects/{pid}/keyword-discovery/runs/{runId}/keywords/{kwId}/serp` | `keyword`, `results[10] {id, position, url, domain, domain_type, authority_score, weakness_component, raw_json}` |
| `/api/projects/{pid}/ai-visibility/suggestions` | `suggestions[] {query_text, source_keyword, source}` |
| `/api/projects/{pid}/ai-visibility/response/{judgementId}` | `{model, response_text, created_at}` |

More shapes seen: content-plan cluster `{cluster_name, rationale, pillar_article {title, status, target_keyword}, supporting_articles[]}`; ranked-keywords `snapshot.report {id, created_at, location_code, language_code, keywords[] {keyword, position, url, search_volume, traffic_estimate, is_pinned}}` and `pinnedRows[] {tracked_keyword_id, keyword, target_url, ranking_url, search_volume, traffic_estimate, position_display, page_url, last_checked_at, history}`.

### Read (GET, not verified)

`/trustcaptain/claim` (method unknown), `/api/broadcast`.

### Write (from client code, not called)

| Method | Path | Likely effect |
|---|---|---|
| POST | `/api/projects/{pid}/articles/generate` | Generate an article (probably uses credits) |
| POST | `/api/projects/{pid}/articles/{articleId}/{action}` | Article action (action name not captured) |
| DELETE | `/api/projects/{pid}/articles/{id}` | Delete article |
| POST, PATCH | `/api/projects/{pid}/content-plan` | Create or update plan |
| POST, PATCH | `/api/projects/{pid}/calendar` | Add or update entry |
| DELETE | `/api/projects/{pid}/calendar/{id}` | Delete entry |
| PATCH | `/api/projects/{pid}/next-actions` | Update action status |
| PUT | `/api/projects/{pid}/ai-visibility/config` | Update config |
| POST | `/api/projects/{pid}/keyword-discovery/runs` | Start a run |
| DELETE | `/api/projects/{pid}/keyword-discovery/runs/{runId}` | Delete a run |
| PATCH | `/api/projects/{pid}/keyword-discovery/keywords/{id}/bookmark` | Bookmark a keyword |
| POST | `/api/projects/{pid}/tracked-keywords` | Add tracked keyword |
| POST | `/api/projects/{pid}/tracked-keywords/check-positions` | Check positions |
| DELETE | `/api/projects/{pid}/tracked-keywords/{id}` | Remove tracked keyword |
| POST | `/api/projects/{pid}/ranked-keywords/refresh` | Refresh report (rate limited) |
| POST | `/api/projects/{pid}/ranked-keywords/groups` | Create group |
| PATCH, DELETE | `/api/projects/{pid}/ranked-keywords/groups/{groupId}` | Update or delete group |
| POST, DELETE | `/api/projects/{pid}/ranked-keywords/groups/{groupId}/members` | Add or remove members |
| POST | `/api/projects/{pid}/backlink-report/refresh` | Refresh backlinks |
| POST | `/api/projects/{pid}/site-health` | Run site audit |
| PUT | `/api/projects/{pid}/listing` | Update listing |
| POST | `/api/projects/{pid}/listing/description/generate` | Generate description |
| POST | `/api/projects/{pid}/listing/localr/sync` | Sync with Localr |
| POST | `/api/projects/{pid}/listing/publish` | Publish listing |
| POST | `/api/projects/{pid}/{droves,gohighlevel,shopify,wix,wordpress}/publish` | Publish article to a CMS |
| DELETE | `/api/projects/{id}` | Delete project |
| POST | `/api/artemis/chat`, `/api/artemis/confirm-action` | Dashboard assistant |
| POST | `/api/feedback` | Send feedback |

### Request bodies the dashboard sends (from its JavaScript, not called)

| Call | JSON body |
|---|---|
| `POST calendar` | `{title, target_keyword, scheduled_for: "YYYY-MM-DD"}` → `{entry}`. The dashboard calls this "Schedule generation": the article is generated on that date. |
| `PATCH content-plan` | `{clusterIndex, articleType: "pillar"\|"supporting", supportingIndex?, status: "not_started"\|"published"}` → `{plan}` |
| `POST content-plan` | `{mode: "rebuild"\|"extend", focus_topics?[], avoid_topics?[], cluster_count?, notes?, conversation_id?}`. 429 body: `{limit, resetTime}` |
| `PATCH next-actions` | `{ruleId}` dismisses the action → `{actions}` |
| `PATCH keyword-discovery/keywords/{id}/bookmark` | no body; toggles the bookmark |
| `POST keyword-discovery/runs` | `{source: "suggestions", seeds: [seed], min_volume}` → `{run_id}`. 429 body: `{tokens, resetTime}` (5 runs per 24 h) |
| `POST tracked-keywords` | `{keyword, target_url}`. 409 if already tracked |
| `POST tracked-keywords/check-positions` | no body. 429 when out of quota |
| `POST ranked-keywords/groups` | `{name}` → group |
| `PATCH ranked-keywords/groups/{id}` | `{name}` |
| `POST` / `DELETE ranked-keywords/groups/{id}/members` | `{keywords: []}` / `{keyword}` |
| `POST ranked-keywords/refresh` | `{}`. 429 body has `message`, `resetTime` (monthly allowance) |
| `POST backlink-report/refresh` | `{}`. 429 body has `message`, `resetAt` |
| `POST site-health` | `{force_rerun, conversation_id?}`. 429 body has `message`, `limit`, `resetTime`. A cached answer has `cached: true` |
| `PUT ai-visibility/config` | `{brand_name, domain, aliases[], enabled, queries: [{query_text, source: "manual"\|"suggested"}], kickoff}` |
| `POST articles/generate` | `{topic, target_keyword, word_count?, angle_notes?}` → `{articleId}` |
| `POST listing/description/generate` | `{business_name, primary_category, secondary_categories, city, state, description}` → `{description}` |
| `PUT listing` | A multi-step form: `{step, draft, ...fields of that step}`. Not exposed by the MCP server. |
| `PATCH calendar` | Exists. Body not captured. Not exposed. |

`rankscore-mcp` exposes the calls above except the last two, behind `RANKSCORE_ENABLE_WRITES=1`. It exposes no delete and no publish call.

Only the endpoints in the pages I opened were found (content-plan, articles, keyword-discovery, ranked-keywords, ai-visibility). The Integrations, Settings, API-key management, site-health and community pages were not opened, so more may exist.
