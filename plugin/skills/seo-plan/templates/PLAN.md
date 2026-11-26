# SEO Plan: {domain}

> Plan dated {YYYY-MM-DD} · Horizon: {n} days · Business type: {type} · Rankings region: {regionLabel}
> RankScore data covers {project domain} only.

## Verdict

- **Lead theme:** {lowest measured pillar} ({score}/100). {One line: why this is the constraint.}
- **First three moves:** {1.1 item}; {1.2 item}; {1.3 item}.
- **Critical path:** {item} → {item} → {item}.
- **Not measured:** {pillars or data not measured, and the Phase 1 item that fixes it, or "none"}.

## Where you are

| Measure | Value | Source |
|---|---|---|
| Ranking keywords (positions 1-3 / 4-10 / 11-30) | {n} ({n} / {n} / {n}) | RankScore ranked keywords, report {created_at} |
| Traffic estimate (sum of `traffic_estimate`) | {n} | RankScore estimate |
| Search Console clicks / impressions, last 28 days | {n} / {n} | Google, property {property}, or "not configured for this project" |
| GA4 organic sessions, last 90 days | {n} | Google, property {id}, or "not configured for this project" |
| Trend | {up / down / flat, with base} | seo-drift, tracked-keyword history or GSC, or "no trend data" |
| Referring domains / backlinks (dofollow share) | {n} / {n} ({pct}%) | RankScore backlinks, refreshed {refreshedAt} |
| Site health | {summary}; {n} fixes | RankScore site audit, {updated_at}, or "not measured" |
| AI visibility | score {n}; brand mentioned in {pct}% of {n} answers | RankScore AI visibility, cycle {cycle_date}, or "not set up" |
| Content pipeline | plan {published}/{total} items published; {n} calendar entries; {n} RankScore articles | RankScore |
| Domain authority, traffic history, top countries | not available from RankScore | |

**Pillar scores:** Technical {n} · Content {n} · Topical {n} · AI search {n} (math in `evidence/03-pillar-scores.md`)

## Competitive frame

SERP competitors, from the top 10 of {k} discovered keywords (RankScore keyword discovery, runs {ids}):

| Domain | Top-10 appearances | Best position | Median authority score | Named in AI answers |
|---|---|---|---|---|
| {domain} | {n}/{k} | {n} | {n} | {yes / no} |

{project domain}: in the top 10 for {n} of {k} keywords; authority score {n} where shown. Context only, not part of the topical authority score: the keywords were picked by opportunity score.

AI-answer competitors (RankScore AI visibility, {n} judgements):

| Name | Mentions | Models |
|---|---|---|
| {name} | {n} | {models} |

{If no discovery run: "SERP competitors: WebSearch stand-in on {n} head keywords, names only, no metrics."}

## Phase 0: Discovery (only when specialists were not run)

| # | Work item | Skill / RankScore tool | Owner | Effort |
|---|---|---|---|---|
| 0.1 | {run seo-technical-audit} | `seo-technical-audit` | {role} | {S/M/L} |

## Phase 1: Foundations (weeks 1-4)

**Goal:** {one-line outcome, for example "remove the technical debt that blocks content work"}

| # | Work item | Skill / RankScore tool | Owner | Effort | Phase-end metric |
|---|---|---|---|---|---|
| 1.1 | {item} | `seo-technical-audit` follow-up | {role} | {S/M/L} | {metric} |
| 1.2 | {item} | `seo-page` | | | |

**Exit criteria:** {what must be true to call Phase 1 done}

## Phase 2: Build (weeks 5-8)

{same shape}

## Phase 3: Compound and measure (weeks 9-12)

{same shape}

## Critical path

1. {item that blocks later work}
2. {item}

Everything not on this list can move.

## Metrics

| Metric | Type | Current | Phase 1 target | Phase 2 target | Phase 3 target | Base rate |
|---|---|---|---|---|---|---|
| Ranking keywords in positions 1-10 | Lagging | {n} | {n} | {n} | {n} | {own trend} |
| Traffic estimate (RankScore) | Lagging | {n} | {n} | {n} | {n} | {own trend} |
| Search Console clicks (if configured) | Lagging | {n} | {n} | {n} | {n} | {GSC 90-day trend} |
| Site-health fix count | Leading | {n} | {n} | {n} | {n} | |
| Content plan items published | Leading | {n} | {n} | {n} | {n} | |
| AI visibility mention rate | Leading | {pct} | {pct} | {pct} | {pct} | |
| Referring domains | Leading | {n} | {n} | {n} | {n} | |

## Constraints and caveats

{User constraints, plus what the data flags. For example: "The top 3 SERP competitors hold 7 of 15 checked results with authority scores 20+ above yours; expect several months before parity on those terms."}

## Recommended next step

Run the Phase 1 work items. After week 4, run seo-drift compare against today's baseline, then adjust the Phase 2 scope.

## Next steps in RankScore (proposals: each runs only after your yes)

| # | Call with arguments | What changes | Cost | Undo |
|---|---|---|---|---|
| 1 | `generate_content_plan(mode: "extend", focus_topics: ["{topic}"], cluster_count: {n})` | Adds clusters to the content plan | Limited per period | No undo tool |
| 2 | `add_calendar_entry(title: "{title}", target_keyword: "{kw}", scheduled_for: "{YYYY-MM-DD}")` | Schedules article generation | Article credits on that date | Remove in the dashboard |

## Skipped

- {part}: {reason: missing setting, Firecrawl not installed, Google not configured, quota used up, user declined}

## Methodology

| Tool or command | Arguments | Date |
|---|---|---|
| `get_ranked_keywords_report` | {project_id or default} | {YYYY-MM-DD} |

Sources: RankScore data is marked "RankScore". WebSearch, WebFetch, Firecrawl and Google results are marked as such.
