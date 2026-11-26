Template for `BRIEF.md`, adapted from SE Ranking seo-skills (MIT). Fill every `{...}`; write `unknown` where no source gives a value. The deliverable starts at the heading below the line.

---

# Content Brief: {proposed title}

**Template type:** {ultimate-guide | how-to | listicle | explainer | comparison | review | best-of | landing-page | MIXED}
**Why this template:** {one sentence: top-10 page-type majority + question pattern + keyword intent}
**Market:** {location / language from get_ranked_keywords_report}
**Briefed:** {YYYY-MM-DD}

RankScore data covers {project domain} only. {If the brief is for another domain: "{domain} is not the project domain: topic candidates, internal links from RankScore and AI visibility were not measured."}

## Target keyword

- Primary: {kw} ({volume}/mo, CPC {cpc}, difficulty tier {tier}; source: {get_keyword_discovery_run run {run_id} | get_ranked_keywords_report | Google Ads Keyword Planner range, {location} / {language} | unknown})
- Secondary: {kw1} ({volume}), {kw2} ({volume}), {kw3} ({volume})
- Questions to answer: {q1}, {q2}, {q3} (source: {RankScore raw SERP People Also Ask | run keywords | top-3 FAQ headings | get_ai_visibility_suggestions})
- Top 10 source: {get_keyword_serp, run {run_id} | web search stand-in: not a Google top 10, no positions}
- SERP features: {AI Overview, People Also Ask, featured snippet, video: those found (RankScore raw SERP, run {created_at}) | unknown (not in RankScore data)}
- Plan item: {cluster_name}, {pillar | supporting #n} | not in the content plan
- Existing ranking page: {url at position n | none}

## Title options

1. {title option 1}
2. {title option 2}
3. {title option 3}

## Meta description (150-160 chars)

{draft}

## Suggested structure

### H1: {proposed H1}

#### H2: {section 1}
Cover: {bullets of what to include}
Cite: {sources to link out to}

#### H2: {section 2}
...

## Gaps the current top 3 miss

- {gap 1, with evidence: which page, what is missing}
- {gap 2, with evidence}
- {gap 3, with evidence}

## Top 3 winners: on-page benchmark (Firecrawl)

| Signal | Winner 1 | Winner 2 | Winner 3 | Required for parity |
|---|---|---|---|---|
| `<title>` length (chars) | {n} | {n} | {n} | {target} |
| Meta description length | {n} | {n} | {n} | {target} |
| `og:image` present | {yes/no} | {yes/no} | {yes/no} | {yes/no} |
| `twitter:card` | {value} | {value} | {value} | {value} |
| JSON-LD types | {Article, ... \| not recovered} | {...} | {...} | {must include} |
| Byline structure (DOM) | {yes/no \| not recovered} | {yes/no \| not recovered} | {yes/no \| not recovered} | {yes/no} |
| Word count (rendered) | {n} | {n} | {n} | {target range} |

`not recovered` = Firecrawl `rawHtml` missing or blocked for that page; it does not mean "no schema". The "must include" column uses only pages where `rawHtml` was read.

(Or: `Top-3 on-page benchmark: skipped (Firecrawl not installed).`)

## Internal linking plan

| From existing page | Anchor text | Target section | Source |
|---|---|---|---|
| {live url \| {title} (not live: link after publishing)} | {anchor} | {section} | {get_ranked_keywords_report \| list_articles, confirmed live by WebFetch \| list_articles, not live} |

Links out from the new article: {pillar url | {pillar title} (URL unknown / not live)}, {live url}, {live url}

## AI search angle

- Tracked in RankScore AI visibility: {yes: "{query_text}" | no: not measured}
- Latest cycle ({cycle_date}): {model}: mentioned {yes/no}, recommended {yes/no}, position {n}; ...
- Brands and sources the AI answers name: {list} (source: get_ai_visibility_response)
- Google AI Overview for the primary keyword: {sources it cites, how it opens (RankScore raw SERP, run {created_at}) | unknown (not in RankScore data)}
- To earn mentions: {specific actions, for example a 60-100 word definition in the first 200 words, a comparison table, a primary study with its date, FAQPage schema}

## Deliverables

- Word count target: {n} (template floor {n}; audit floor {n})
- Tone and voice: {from get_listing and the project's existing articles}
- Required assets: {images, schema types, examples, tables}

## Traffic potential

- Conservative: ~{n}/mo at position 5
- Target: ~{n}/mo at positions 1-3
- Click-through rates used: {from the project's ranked keywords | assumed: n% / n%} (or: `unknown: no RankScore volume for this keyword`)

## Next steps in RankScore (proposals: nothing runs without your yes)

| Call | Arguments | Cost | Undo |
|---|---|---|---|
| `generate_article` | topic "{...}", target_keyword "{...}", word_count {n}, angle_notes "{...}" | Article credits | Delete in the dashboard |
| `add_calendar_entry` | title "{...}", target_keyword "{...}", scheduled_for {YYYY-MM-DD} | Article credits on that date | Remove in the dashboard |
| {other proposals from SKILL.md} | | | |

## Methodology

- Date: {YYYY-MM-DD}
- RankScore calls: {tool(arguments)}, ... (never credentials)
- Web: WebSearch "{query}"; WebFetch {urls}; Firecrawl {urls | not installed}
- Skipped: {part}: {reason}

## Raw data references

- evidence/01-project-context.md
- evidence/02-topic-candidates.md
- evidence/03-serp-and-keywords.md
- evidence/04-content-analysis.md
- evidence/05-internal-links.md
- evidence/serp-raw.json (discovery-run path only)
- evidence/ai-visibility.json
