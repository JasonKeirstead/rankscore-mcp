Template for `VERDICT.md`, adapted from SE Ranking seo-skills (MIT). Fill every `{...}`; write `not measured` where no source gives a value. The deliverable starts at the heading below the line.

---

# Content Audit: {URL or title}

> Audited {YYYY-MM-DD} · Target keyword: "{keyword}" · Market: {market} · Source: {live URL | RankScore article {id}, not published | pasted text}

## Verdict: {PUBLISH | PUBLISH WITH FIXES | NO PUBLISH}

{One sentence summary of why}

RankScore data covers {project domain} only. {If the URL is on another domain: "{domain} is not the project domain: rankings, backlinks, content plan and GA4 were not measured."}

Thresholds used: E-E-A-T {75}% / CITE {70}% ({default | YMYL | general-interest}).

## Scores

| Dimension | Score | Threshold | Status |
|---|---|---|---|
| Experience | {n}% | 75% | {✓/✗} |
| Expertise | {n}% | 75% | {✓/✗} |
| Authoritativeness | {n}% | 75% | {✓/✗} |
| Trustworthiness | {n}% | 75% | {✓/✗} |
| **E-E-A-T composite** | {n}% | 75% | {✓/✗} |
| Clear answer | {n}% | 70% | {✓/✗} |
| Include stats | {n}% | 70% | {✓/✗} |
| Timestamp | {n}% | 70% | {✓/✗} |
| Entity authority | {n}% | 70% | {✓/✗} |
| **CITE composite** | {n}% | 70% | {✓/✗} |

{Pre-publish only: "Items scored: {n}/60 E-E-A-T, {n}/30 CITE. {n} items are pending CMS and left out of the scores (listed under Pending CMS)."}

## Veto checks

- Anonymous authorship on YMYL topic: {triggered / not triggered / pending CMS: add before publishing} ({high confidence: Firecrawl rawHtml schema + DOM byline | medium: prose only | medium: rawHtml not recovered})
- Factual claims without sources: {triggered / not triggered}
- Undisclosed affiliate/sponsored relationships: {triggered / not triggered}
- AI-generated YMYL with no human review: {triggered / not triggered / pending CMS: add before publishing} ({n}/8 AI-content markers fired{; markers #2/#8 reflect RankScore batch generation, if so})
- Answer in first 300 words: {present / missing}
- Datestamp on time-sensitive content: {present / missing / pending CMS: add before publishing / not time-sensitive}
- Entity disambiguation for proper nouns: {present / missing / no proper-noun query}

{Pre-publish only:}

## Pending CMS (add before publishing)

- {item, for example "Expertise 1: author byline"}: {from site template {url}: lacks it | no live post found}
- A pending veto caps the verdict at PUBLISH WITH FIXES. Re-audit the live URL after publishing.

## AI search readiness

- Keyword tracked in RankScore AI visibility: {yes: "{query_text}" | no: not measured}
- Latest cycle ({cycle_date}):

| Model | Mentioned | Recommended | Position | Domain cited | Competitors named |
|---|---|---|---|---|---|
| {model} | {yes/no} | {yes/no} | {n} | {yes/no} | {list} |

- Sources and brands the AI answers named: {list} (source: get_ai_visibility_response)
- Audited URL named in any answer: {yes / no / not measured}
- Organic winners compared: {url 1}, {url 2}, {url 3} (source: {get_keyword_serp, run {run_id} | web search stand-in})
- Specific gaps vs winners:
  - {gap 1}
  - {gap 2}
  - {gap 3}

- Google AI Overview: {AI Overview impressions {n}, clicks {n} for this URL, last {n} days (Search Console) | not measured: RankScore does not measure AI Overviews and Search Console is not configured}

## Snapshot (measured)

- Page type: {type} · word count {n} · floor {n}
- RankScore ranking for "{keyword}": {#position, traffic estimate {n} | not in the ranked-keywords report | not measured (other domain)} (get_ranked_keywords_report)
- Backlinks to this URL: {n} from {m} referring domains, refreshed {refreshedAt} (get_backlink_report) | not measured (other domain)
- Content plan: {cluster_name}, {pillar | supporting}; pillar marked {published / not_started}; pillar links here {yes / no / pillar URL unknown: not checked} | not in the plan
- GA4 organic last 28d: {sessions} sessions / {users} users / engagement {as returned} | no sessions recorded | not configured
- Search Console: target keyword {among the page's queries: {impressions} impressions, position {n} | not among its queries} | not configured
- Natural Language: top entities {list}; document sentiment {score} | not configured
- (If Google is not set up: `Google enrichment: not configured (run bash <plugin root>/extensions/google/install.sh)`)

## Top 5 fixes (impact-ranked)

1. {Specific fix linked to a low-scored item or veto}
2. {Specific fix}
3. {Specific fix}
4. {Specific fix}
5. {Specific fix}

## Detailed scoring

See:
- `03-eeat-scoring.md`: item-by-item E-E-A-T (60 items) and AI-content markers
- `04-cite-scoring.md`: item-by-item CITE (30 items)
- `05-winner-comparison.md`: gap analysis vs AI-answer sources and organic winners
- `evidence/03-measured-signals.md`: raw rankings, backlinks, GA4, Search Console and Natural Language output behind the Snapshot

## Next steps in RankScore (proposals: nothing runs without your yes)

| Call | Arguments | Cost | Undo |
|---|---|---|---|
| {tool} | {exact arguments} | {credits / quota / free} | {how, or "no"} |

## Recommended next step

- PUBLISH: ship; take a `seo-drift` baseline to track the page after it goes live.
- PUBLISH WITH FIXES: hand the top 5 fixes to the writer; re-audit after the fixes.
- NO PUBLISH: rework the piece against the failing dimensions; re-audit before publishing.

## Methodology

- Date: {YYYY-MM-DD}
- RankScore calls: {tool(arguments)}, ... (never credentials)
- Web: WebFetch {urls}; WebSearch "{query}"; Firecrawl {urls | not installed}
- Google: {ga4_report.py arguments | not configured}
- Skipped: {part}: {reason}
