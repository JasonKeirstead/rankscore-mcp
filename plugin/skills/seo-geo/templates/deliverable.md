# Template for GEO.md (seo-geo)

Copy the block below into the run folder's `GEO.md` and fill it. Remove sections that do not apply and name them under "Skipped".

```markdown
# GEO Analysis: {URL}

> Snapshot {YYYY-MM-DD} · Keywords analysed: {n} · Ranked-keywords report: {created_at}, {location_code}/{language_code}
> Focus keywords: {list}, primary first (source: ranked-keywords report | user | page title and H1)
> RankScore data covers {domain} only. AI data: {n} tracked prompts on {model list}. It is not Google AI Overview data.

## Verdict

- Page citability: average {x}/10; best passage {x}/10; weakest {x}/10
- Domain cited in {k} of {n} AI judgements for this page's topics ({models}); this URL named in {j} of them (answer text)
- Google AI Overview: this URL shown for {q} queries ({impressions} impressions, {clicks} clicks) | Search Console returned no AI Overview rows for this property (filter may be unsupported) | Google enrichment: not configured
- Top fix: {one line}

## Citation footprint

| Keyword | Organic pos. | Volume | Traffic est. | Tracked AI prompts | Domain cited (models) | URL named in answer | Competitors named | GSC AI Overview impr. |
|---|---|---|---|---|---|---|---|---|
| {keyword 1} | {n} | {n} | {n} | {k} | {model a, model b} | yes / no | {names} | {n} / none / no property rows / not configured |
| {keyword 2} | ... | ... | ... | 0 (not tracked) | n/a | n/a | n/a | ... |

**Domain citation rate: {k}/{n} judgements ({%}) for the tracked prompts that match this page.** Domain-level, tracked prompts only (RankScore). Positions, volume and traffic: RankScore ranked-keywords report.

## Where the page or domain IS cited

- {prompt} ({model}): passage named: "{short excerpt}" (answer text)
- {query} (Google Search Console AI Overview): {impressions} impressions, position {x}

## Where it is NOT cited

- {keyword or prompt}: the comparison sources ({named in AI answer | top organic result (RankScore) | web search stand-in}) share these patterns:
  - {pattern 1: short definitive answer in the first 100 words}
  - {pattern 2: numbered stat with a date}
  - {pattern 3: Article schema with author bio}
- The page is missing: {specific gap}.

## Page passage-level audit

Top-scoring passages:
1. {passage at H2 "X"}: {8}/10. Strong: definitive sentence, named stat. Weak: no date.
2. ...

Lowest-scoring passages (refresh candidates):
1. {passage at H2 "Y"}: {3}/10. Weak: vague, no specific data.
2. ...

Words before the first direct answer to "{primary keyword}": {n}.

## Schema check ({Firecrawl rendered HTML | curl static HTML, misses JavaScript-added JSON-LD | skipped ({reason})})

- `Article` (or a sub-type) present and valid: {yes / no}
- `author` with `@type: Person` and `url`: {yes / no}
- `datePublished` and `dateModified` in ISO 8601: {yes / no}
- `FAQPage` for visible Q&A: {yes / no / not applicable}
- `BreadcrumbList`: {yes / no}
- `mainEntityOfPage` self-canonical: {yes / no}

## AI-protocol files

- `/llms.txt`: {HTTP 200, present | HTTP {n}, absent}
- `/.well-known/rsl.json` (or `/RSL.txt`): {HTTP 200, present | HTTP {n}, absent}
- Stance: {permissive / restrictive / mixed / unknown}, from the declared categories and allow and deny scope

## Recommendations (top 5 to improve citability)

1. {Specific change, for example: "Add a 60-word answer after the H1 that answers '{primary keyword}'. The page now puts the answer after 800 words of preamble."}
2. {Specific change}
3. {Specific change}
4. {Specific change}
5. {Specific change}

## Next steps in RankScore (proposals; each runs only after your yes)

1. `add_tracked_keyword(keyword: "{keyword}", target_url: "{url}")`: tracks the keyword for this page. Cost: no credit cost in the catalog. Undo: remove it in the dashboard.
2. `set_ai_visibility_config(brand_name: "{brand}", domain: "{domain}", aliases: [...], enabled: {as now, from evidence/ai-visibility.json}, queries: [{every current query} + "{prompt for this page's topic}"], kickoff: false)`: replaces the whole setup; current setup saved in `evidence/ai-visibility.json`. Cost: free without kickoff. Undo: send the saved setup again.
   - {Only when `enabled` is now `false`:} Separate item: switch tracking on (`enabled: true`) in the same call? This needs its own yes. Without it, `enabled` stays `false`.
3. `run_site_health()`: free if it returns `cached: true`; otherwise it starts a site audit (quota).

## Recommended next step

Re-run seo-geo on this URL about 30 days after the changes, after the next AI visibility cycle and with fresh Search Console data.

## Skipped

- {part}: {reason (another domain, setting missing, Firecrawl not installed, Google not configured, quota used up)}

## Methodology

- `get_ranked_keywords_report()`: {date}
- `get_ai_visibility(include_raw_output: false)`, `get_ai_visibility_response(judgement_id: ...)` x {n}: {date}
- `get_keyword_discovery_run(run_id: ...)`, `get_keyword_serp(run_id: ..., keyword_id: ...)`: {date or "not run"}
- `gsc_query.py --dimensions query --ai-overview` / `--ai-mode` (property level): {row counts, date or "not run"}
- `gsc_query.py --dimensions query --page {url} --page-match equals --ai-overview` / `--ai-mode`: {date, or "not run: no property-level rows"}
- WebFetch: {URLs}; WebSearch: {queries}; curl or Firecrawl: {URLs}
- Citability rubric: complete thought 0-3, answers the H2 question 0-3, stat or entity 0-2, date or freshness 0-2.
```
