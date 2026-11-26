# Cluster Plan: {topic} {(needs review: N quality-gate failures), only if step 9 flagged any}

RankScore data covers {project domain} only.
Mode: {cluster | long-tail} · Seeds: {list} · Data date: {YYYY-MM-DD}
Keyword data: RankScore discovery runs {run ids} (`source`: {value}); rankings report {regionLabel}, {created_at}.
{If the target is another domain: "Target {domain} is not the RankScore project: rankings, content plan, calendar and article checks did not run."}

## Verdict

1. **{Cluster}** [{PILLAR | SPOKE-ONLY}], score {n}: {one line: volume, ease, flags}
2. **{Cluster}** ...
3. **{Cluster}** ...

## Summary

- Keywords analysed: {n} (discovery {n}, rankings {n}, bookmarks {n}, WebSearch questions {n} without volume)
- Clusters formed: {n} ({n} new, {n} partly in plan, {n} in plan)
- Combined monthly volume: {n} (RankScore `search_volume` only) {| incl. Google Ads Keyword Planner: {n} (exact values only), only if the user opted in}
- Google Ads Keyword Planner ({location}/{language}): {n} keywords in the separate `ads_volume` column, not in totals or scores {| not configured | failed: {error}}
- Pillars: {n}, spokes: {n} ({n} already published, generated, planned or scheduled)
- Quick wins (own URL at position 4-20): {n}
- Clustering: top-10 SERP overlap from `get_keyword_serp` ({n} keywords), WebSearch stand-in ({n}), unverified ({n})

## Build order

### Cluster 1: {cluster name} [PILLAR] · score {n} · {flags}
- Primary keyword: {keyword} ({search_volume}/mo RankScore{, Google Ads {ads_volume}}, tier {difficulty_tier}, opportunity {opportunity_score})
- Secondary: {list}
- Total volume: {n}/mo (RankScore `search_volume`)
- SERP features: {PAA questions, featured snippet, AI Overview (RankScore raw SERP) | none in the RankScore data}
- Content plan: {new | partly in plan: "{plan cluster_name}" | in plan}
- Own rankings: {keyword: position {n}, {url} | none}

#### Pillar page
- H1: {H1}
- H2s: {list}
- Status: {new | plan article "{title}" ({status}) | scheduled {date} | generated {project_url} {(not confirmed live)}}

#### Spoke articles
1. **{spoke title}**
   - H1: {H1}
   - H2s: {list}
   - Target keyword: {keyword} ({search_volume}/mo RankScore{, Google Ads {ads_volume}})
   - Status: {new | in plan | published (plan) | scheduled | generated}
2. **{spoke title}** ...

### Cluster 2: {cluster name} [SPOKE-ONLY] · score {n} · {flags}
...

## Internal linking map

- Pillar A ({project_url} {(not confirmed live)} | planned) links to: spokes A1, A2, A3
- Spoke A1 links back to: pillar A; cross-links to spoke B2 (2-3 shared URLs)
...

## Content tier
{Long-tail mode only: the section from references/long-tail-tier.md, part 7.}

## Quality scorecard

{If all four gates pass:}
All gates passed (cannibalisation/orphan/coverage/anchor-diversity).

{If any gate fails, this table instead:}

| Gate | Status | Detail |
|---|---|---|
| Cannibalisation (no two clusters with 40%+ primary SERP overlap; no two clusters on one own URL) | RED / YELLOW / GREEN | {detail} |
| Orphan (every spoke linked from its pillar) | RED / YELLOW / GREEN | {detail} |
| Coverage (pillar covers 70%+ of the cluster's high-volume keywords) | RED / YELLOW / GREEN | {detail} |
| Anchor diversity (no anchor on more than 40% of a cluster's internal links) | RED / YELLOW / GREEN | {detail} |

Unverified keywords (not in the cannibalisation math): {list | none}

## Next steps in RankScore

Proposals only. None has run. Reply yes to a numbered call to run it. A yes to several calls must name them or their count ("yes to 3-8", "yes to all 6 calendar entries").

1. `start_keyword_discovery_run(seed: "{seed}", min_volume: {n})`: keywords for seed "{seed}". 1 of about 5 runs per 24 hours ({n} used in the last 24 h). Undo: no.
2. `generate_content_plan(mode: "extend", focus_topics: [...], avoid_topics: [...], cluster_count: {n}, notes: "...")`: adds {n} clusters to the content plan. Limited per period. Undo: no tool.

Calendar: {N} entries = {N} articles' worth of article credits. Keywords already scheduled, generated or published, and plan articles with a calendar entry, are left out.

3. `add_calendar_entry(title: "{H1}", target_keyword: "{keyword}", scheduled_for: "{YYYY-MM-DD}")`: schedules 1 article; uses article credits on {YYYY-MM-DD}. Undo: remove in the dashboard.
4. `add_calendar_entry(title: "{H1}", target_keyword: "{keyword}", scheduled_for: "{YYYY-MM-DD}")`: schedules 1 article; uses article credits on {YYYY-MM-DD}. Undo: remove in the dashboard.
   ...
{n}. `toggle_keyword_bookmark(keyword_id: "{id}")` ("{keyword}"): no credits. Undo: toggle again.
   ...
{n}. `add_tracked_keyword(keyword: "{keyword}", target_url: "{url}")`: no credits. Undo: remove in the dashboard.

## Sources and gaps

- RankScore: discovery runs, `get_keyword_serp` (raw SERP for {n} primary keywords), rankings report, bookmarks, content plan, calendar, articles.
- WebSearch (not RankScore data): question phrasings {n}, stand-in SERPs {n}.
- Google Ads Keyword Planner ({location}/{language} | US/English defaults): {n} volumes in `ads_volume`, not in totals or scores | not configured | failed: {error}.
- Articles flagged `generated` exist in RankScore; {n} of their URLs are not confirmed live (not in the rankings report).
- Not measured: SERP features {for all clusters | for {n} clusters whose raw SERP held none}; volume for {n} WebSearch questions; keywords below the `min_volume` of reused runs {list}; {skipped parts with reason}.

## Methodology

- {YYYY-MM-DD}
- `get_keyword_discovery_runs()`
- `get_keyword_discovery_run(run_id: "{id}")` × {n}
- `get_keyword_serp(run_id: "{id}", keyword_id: "{id}")` × {n}
- `get_keyword_serp(run_id: "{id}", keyword_id: "{id}", include_raw_json: true)` × {n} (primary keywords of pillar clusters; long-tail mode: of every cluster)
- `get_keyword_bookmarks()`, `get_ranked_keywords_report()`, `get_content_plan()`, `get_calendar()`, `list_articles(limit: 500, offset: {n})`
- WebSearch queries: {list}
- Keyword Planner: `keyword_planner.py volume "{keywords}" --location {id} --language {id} --json` | not run
- Priority weights: volume 40% (RankScore `search_volume` {| incl. Google Ads Keyword Planner}), ease 30%, intent 30% ({intent weights used})

## Raw data

- keywords.csv: full keyword list with sources
- 03-cluster-assignment.md: every keyword, its cluster and the SERP overlap matrix
- 06-quality-scorecard.md: standalone copy of the scorecard
- evidence/: SERP cache, content plan as read, WebSearch notes
