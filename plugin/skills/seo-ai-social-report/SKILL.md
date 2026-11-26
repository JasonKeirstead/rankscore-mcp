---
name: seo-ai-social-report
description: Builds one cross-channel performance report for a period from the RankScore project's data (keyword positions and estimated traffic, tracked-keyword movement, backlinks, site health, AI-visibility score by cycle, per-model mentions, citations, sentiment and share of voice on tracked prompts, articles published) together with Planable social engagement and optional Google Search Console and GA4 trends. Delivers a short number-led summary in chat, REPORT.md and a self-contained interactive HTML report with KPI cards, trend charts, share of voice and top posts. Use when the user says "give me a full report across SEO and social", "how did we do this month across search and social", "combined SEO + AI + social report for this client", "build a cross-channel dashboard" or "one report that covers rankings, AI visibility and social". Covers the project's own domain only.
---

# Unified SEO, AI and social report

Most reporting makes clients read three tools separately. This skill produces one view: search rankings, backlinks, site health, content output and AI-answer visibility from RankScore, social engagement from Planable, and organic traffic trends from Google when it is configured. It gives quick text conclusions for the inbox and an interactive HTML report for the detail.

## Prerequisites

- **RankScore MCP** with the account email and password set (project reads). The API key adds `list_articles` for the content KPI. "Enable write tools" is needed only for the site-health read and the refresh jobs in step 2.
- **Planable MCP** (optional; a separate server, not part of RankScore) with the workspace and connected pages. Without it, the social section is skipped and named in the report. This skill only reads from Planable; it creates and changes nothing there. Setup guide: https://help.planable.io/hc/en-us/articles/27538577098780-How-to-connect-Planable-MCP-to-your-AI-tools
- From the user: the reporting period (default: the previous calendar month), the Planable workspace, and a client name for the file name.

### What this skill cannot do with RankScore

- No ranking history for the whole keyword set: `get_ranked_keywords_report` is one snapshot. Trends come from tracked keywords (`pinnedRows[].history`), from an earlier run's saved snapshot, or from Google Search Console.
- No measured organic traffic: RankScore gives `traffic_estimate` per keyword (labelled "estimated"). Measured clicks and sessions need Google Search Console (Tier 1) or GA4 (Tier 2).
- No AI opportunity traffic, link-presence or average-position AI metrics. The AI section uses the RankScore score, per-model results, mention and citation rates and sentiment, on the project's tracked prompts only. Per-prompt data exists for the latest cycle only.
- Share of voice covers the tracked prompts and the competitors the AI answers name. A competitor domain the user names is shown only if the answers name it.
- No conversions or attribution. Snapshots are as fresh as their last refresh, and refreshes are limited.

## Process

1. **Validate target and preflight.** Run the preflight in `../../references/preflight.md` (RankScore access, Firecrawl, Google). Skill-specific notes:
   - RankScore tools: `get_ranked_keywords_report`, `get_backlink_report`, `get_ai_visibility`, `get_content_plan`, `get_calendar`, `list_articles`. Jobs it may propose in step 2, each only after the user's yes: `run_site_health` without `force_rerun` (no cost when cached; otherwise it starts an audit that uses quota or credits), `refresh_ranked_keywords_report` and `refresh_backlink_report` (refresh allowances), `check_tracked_keyword_positions` (quota). A report makes no other writes: it does not dismiss next actions or change plan statuses.
   - Firecrawl: not used.
   - Google APIs: Tier 1 (Search Console) for the clicks and impressions trend and AI Overview queries; Tier 2 (GA4) for organic sessions and AI-assistant referrals. Without them, the organic-trend chart is omitted and named.
   - Planable: call `list_workspaces`. If the tool is missing or fails, the social section is skipped.
   - If the user asks for a report on a domain that is not the project's domain, say that RankScore cannot describe it. Only the Planable section, and the Google sections if that site's properties are configured, can run.

2. **Scope and freshness.** Take the domain and brand from `get_ai_visibility.config` (`domain`, `brand_name`). Resolve the period to explicit start and end dates, and the comparison period of the same length before it. Then check how fresh the RankScore snapshots are, and propose jobs in the preflight shape where they help. Each ask names the exact call, its cost and that it cannot be undone, and runs only on the user's yes for that call:
   - `snapshot.report.created_at` of `get_ranked_keywords_report`, and `refreshedAt` of `get_backlink_report`. If a snapshot is older than the period end, offer the refresh: "RankScore: `refresh_ranked_keywords_report()` (or `refresh_backlink_report()`; no arguments) uses 1 of {refresh.remaining}/{refresh.limit} refreshes, resets {refresh.resetAt}. Cannot be undone. Run it? (y/N)". After a refresh, call the read tool again and check that `snapshot.report.created_at` or `refreshedAt` changed. If it did not, the refresh has not finished: use the old snapshot and show its date. If the user says no, show the snapshot date on the card.
   - `check_tracked_keyword_positions()` (no arguments) if the tracked keywords' `last_checked_at` is older than the period end: "RankScore: `check_tracked_keyword_positions()` rechecks the tracked keywords. It uses quota; no tool shows how much is left. Cannot be undone. Run it? (y/N)". Afterwards, call `get_ranked_keywords_report` again and check `snapshot.pinnedRows[].last_checked_at`; if it did not change, the recheck has not finished.
   - Site health: "RankScore: `run_site_health` without `force_rerun` returns the latest audit from cache at no cost. If there is no recent audit, it starts a new site audit. That is a job and uses audit quota or credits; the catalog does not say how much and no tool shows what is left. Cannot be undone. Run it? (y/N)". Use the result only if it says `cached: true`, and show its `updated_at`.

3. **Pull SEO.** Save each raw result to `evidence/`.
   - `get_ranked_keywords_report`: keyword count, position distribution (1-3, 4-10, 11-20, 21-100), the sum of `traffic_estimate` (label it "estimated"), and the top keywords by `traffic_estimate`. Tracked keywords: `pinnedRows[]` with `position_display` and `history` (its shape is not documented: read what comes back) give the movers in the period. A period-over-period delta comes only from `history` or from an earlier run's `evidence/ranked-keywords.json`; otherwise leave the delta blank.
   - `get_backlink_report` with `max_rows: 1000`: referring domains and backlinks (use the `_truncated` totals), dofollow share, and referring domains whose `first_seen` is inside the period (new).
   - Site health from step 2: the score or the number of `fixes[]`, whichever the answer gives, with `updated_at`.
   - Google Tier 1: `python3 <skill dir>/../../scripts/gsc_query.py --start-date {start} --end-date {end} --dimensions date --json` for daily clicks and impressions, and the same for the comparison period. `<skill dir>` is the skill's base directory shown when the skill loads.
   - Google Tier 2: `python3 <skill dir>/../../scripts/ga4_report.py --report organic --days {n} --json`. The script counts back from yesterday, so set `--days` to reach the start of the comparison period and keep only the dates of each period from `daily_data`.

4. **Pull AI search.**
   - `get_ai_visibility`: `snapshots[]` with a `cycle_date` inside the period, plus the last cycle before it, give the score trend and the `per_model` values. If the earliest cycle in the data is inside the period, treat it as a baseline, not growth. Mark incomplete cycles (`judgements_complete` lower than `judgements_expected`) as partial.
   - `latestJudgements[]` (latest cycle): mention rate (`mentioned`), citation rate (`domain_cited`), median `mention_position`, `sentiment` mix, and share of voice on tracked prompts = brand mentions divided by all brand mentions (the brand plus each name in `competitors_mentioned`). Omit share of voice if the answers name no competitors.
   - Optional (Google Tier 1): the same `gsc_query.py` command with `--ai-overview` gives clicks and impressions from AI Overview appearances. Optional (Tier 2): `ga4_report.py --report referrals --sources ai --days {n} --json` gives sessions from AI assistants; it covers the last `{n}` days to yesterday, so label its window if it is not the period.

5. **Pull content output.** `list_articles` (`limit: 500`): articles whose `created_at` is inside the period. `get_content_plan`: published against `not_started` articles. `get_calendar`: entries with `scheduled_for` inside the period, by `status`; name failed ones.

6. **Pull social (Planable).**
   - `list_pages(workspaceId)` for the page IDs.
   - `get_page_metrics_summary(workspaceId, pageIds, startDate, endDate)`: account-level audience, impressions and engagement rate.
   - `get_post_metrics_summary(workspaceId, pageIds, startDate, endDate)`: totals for posts published in the window. This scope differs from page impressions: keep them separate.
   - `get_post_metrics(workspaceId, pageIds, ..., limit: 5)`: top posts. `list_posts(...)`: posts published in the period (volume and cadence).
   - For a monthly social trend, call `get_page_metrics_summary` once per month.
   - Pages in `unsupportedPages` (often X, Pinterest, Threads, Google Business Profile) have no page-level metrics: base totals on the supported pages and list the rest as "data not available".

7. **Write the quick conclusions in chat.** About 10-15 lines: the headline move in each area (SEO, AI search, content, social), then 2-3 specific callouts ("what moved", "what to watch"). Number-led, no filler. This is the part most people read.

8. **Build the reports.** Copy `templates/report-template.html` into the run folder as `{client-slug}-{period-slug}-cross-channel-report.html` and replace only the `DATA` object with the real values (the field guide is in the template). Then write `REPORT.md`.
   - KPI cards: estimated organic traffic or Search Console clicks, keywords in the top 10, referring domains, site health, AI visibility score, share of voice, articles published, social impressions, engagement rate, posts. Give a period-over-period delta only where a real earlier value exists; otherwise leave it empty.
   - Charts: organic trend (clicks and impressions, or sessions), AI score by cycle, per-model results, position distribution, social impressions and engagement. When two series have very different scales, put them on a dual axis (`axis: "y2"`) or in separate charts so the smaller line does not flatten. A series with one data point shows the point and no trend line.
   - Share of voice: omit the section when no competitors are named.
   - Mark partial periods (for example month to date, or an incomplete cycle) so a short bar is not read as a drop.
   - List every skipped part in `skipped` with the reason.
   - Validate the script: copy the content of the inline `<script>` block to a scratch `.js` file and run `node --check` on it, if Node is installed. Fix any syntax error before handing over.

## Output format

One folder per run, `seo-ai-social-report-{client-slug}-{YYYYMMDD}/`:

```
01-seo.md                  rankings, backlinks, site health, Google trends
02-ai-visibility.md        score by cycle, per-model, mentions, citations, sentiment, share of voice
03-content.md              articles, plan status, calendar
04-social.md               page and post metrics, top posts
evidence/                  raw tool results
REPORT.md                  the deliverable in text
{client-slug}-{period-slug}-cross-channel-report.html
```

`REPORT.md`, verdict first:

1. **Headline** (5-8 lines): the main move in each area. Scope line: `RankScore data covers {domain} only.` The exact period and comparison period.
2. **SEO**, **AI search**, **Content**, **Social**: the KPIs with source labels (RankScore, Search Console, GA4, Planable) and snapshot dates.
3. **What moved / What to watch**: the same callouts as the chat summary.
4. **Next steps in RankScore** (only if useful): the refresh jobs from step 2 that were not run, as a table `Call | Exact arguments | What changes | Cost | Undo`, so the next report starts from fresh snapshots.
5. **Skipped parts** with the reason, then **Methodology**: each tool call with its arguments (never credentials) and the date.

The HTML report footer names the data sources, the generation date and the exact date range, and says that conversions and attribution are not covered.

## Tips

- Keep the chat summary short; the HTML is the detailed artefact. Do not repeat the full report in chat.
- Round for readability (48K, 4.2%). Never invent a trend or a delta.
- RankScore snapshots and AI cycles do not line up with calendar months. Always show the snapshot date or cycle date next to the number.
- In thin periods (little published, rankings barely moved), say so plainly instead of dramatising noise.
- For a deeper AI-visibility analysis, use [seo-ai-search-share-of-voice](../seo-ai-search-share-of-voice/SKILL.md); for a saved SEO baseline and regression checks between runs, [seo-drift](../seo-drift/SKILL.md).

Adapted from SE Ranking seo-skills (MIT). See ../../THIRD_PARTY_NOTICES.md.
