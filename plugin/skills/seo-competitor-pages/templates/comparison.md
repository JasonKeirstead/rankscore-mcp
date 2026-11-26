# COMPARISON.md template

`COMPARISON.md` has three parts: editor notes (first 30 lines), the page draft, and the editor appendix. Remove the notes and the appendix before publishing.

## Editor notes

```markdown
## Editor notes (remove before publishing)

- Verdict: {publish as a new page | update {existing URL} | wait for demand data}.
- Target keyword: {keyword}. Demand: {volume}/mo, tier {difficulty_tier}, opportunity {opportunity_score} (RankScore discovery run {run_id}) | no RankScore volume; Search Console: {impressions} impressions in 90 days | not configured.
- RankScore data covers {project domain} only. Competitor facts come from their own pages (WebFetch, {date}).
- Own rankings for the keyword: {position}, {url} | not in the rankings report.
- Pages to beat: {top 3 URLs} (RankScore `get_keyword_serp` | WebSearch stand-in, no positions).
- Duplicates: none | plan article "{title}" ({status}) | calendar {date} | article {project_url}.
- AI answers name: {competitors} (RankScore AI visibility, {cycle_date}).
- SERP features: {PAA, featured snippet, AI Overview (RankScore raw SERP) | none in the RankScore data | not checked: no run has the keyword}.
- FAQ source: {People Also Ask (RankScore raw SERP) | discovered question keywords | WebSearch phrasings | competitor FAQ pages}. {Not validated against People Also Ask, when no PAA came from the raw SERP.}
- Open TBDs: {n} matrix cells to confirm (05-feature-matrix.md).
- Skipped: {Firecrawl schema capture | Google demand | discovery data}, with the reason.
```

## Page draft: "X vs Y"

```markdown
# {User's Brand} vs {Competitor}: {YYYY} Comparison

> Updated {YYYY-MM-DD}. Compare {Brand A} and {Brand B} on pricing, features, integrations and best-fit use case.

## TL;DR
{One paragraph, balanced verdict: when to choose A, when to choose B.}

## At a glance

| Dimension | {Brand A} | {Brand B} |
|---|---|---|
| Starting price | {$X/mo} | {$Y/mo} |
| Free tier | {✓/✗} | {✓/✗} |
| Best for | {use case} | {use case} |
| Integrations | {n} | {n} |
| Support | {tier} | {tier} |
| ... | | |

## {Dimension 1, for example Pricing}
{Side-by-side detail, balanced. No hyperbole.}

## {Dimension 2, for example Features}
{...}

## {Dimension 3, for example Integrations}
{...}

## {Dimension 4, for example Support}
{...}

## When to choose {Brand A}
- {scenario 1}
- {scenario 2}
- {scenario 3}

## When to choose {Brand B}
- {scenario 1}
- {scenario 2}
- {scenario 3}

## FAQ
**{Question 1}**
{Answer}

**{Question 2}**
{Answer}

**{Question 3}**
{Answer}

## Related reading
- [{project article title}]({project_url})

## Get started
{Brand A} CTA: {link}
{Brand B} CTA: {link if the page stays balanced; otherwise drop}

## Schema
See `schema.jsonld`: paste into the page head.
```

## Changes for an "alternatives to X" page

- H1: `{N} Best {Competitor} Alternatives in {YYYY}`.
- TL;DR: who should switch from {Competitor}, and to which option.
- At a glance: one row per tool, with columns Best for, Starting price, Free tier, Key difference from {Competitor}.
- One H2 per alternative (numbered): what it is, best for, pros, cons, pricing, how it differs from {Competitor}. The user's product is one of N, not automatically number 1.
- A short "How we compared" section that names the dimensions and the sources.
- FAQ and Get started as above.

## Changes for a "best X for Y" page

- H1: `Best {Category} for {Use case} ({YYYY})`.
- TL;DR: the pick per segment in 2-3 sentences.
- One H2 per segment ("Best for {segment}: {Product}"), each with why, limits and pricing.
- A comparison table across all picks, then "How we chose", FAQ and Get started.

## schema.jsonld skeleton

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {"@type": "Product", "name": "{Brand A}", "description": "{one line}", "brand": {"@type": "Brand", "name": "{Brand A}"}, "url": "{product URL}"},
    {"@type": "Product", "name": "{Brand B}", "description": "{one line}", "brand": {"@type": "Brand", "name": "{Brand B}"}, "url": "{product URL}"},
    {"@type": "BreadcrumbList", "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "{Section}", "item": "{URL}"},
      {"@type": "ListItem", "position": 2, "name": "{Page title}", "item": "{page URL}"}
    ]},
    {"@type": "FAQPage", "mainEntity": [
      {"@type": "Question", "name": "{Question 1}", "acceptedAnswer": {"@type": "Answer", "text": "{Answer 1}"}}
    ]}
  ]
}
```

Add `offers`, `aggregateRating` or `review` only when the page shows the same prices, ratings or reviews. Drop `FAQPage` when the FAQ is not real Q&A.

## Editor appendix

```markdown
---

## Editor appendix (remove before publishing)

### Next steps in RankScore
Proposals only. None has run. Reply yes to a numbered call to run it.
1. `generate_article(topic: "...", target_keyword: "...", word_count: {n}, angle_notes: "...")`: uses article credits. Undo: no delete tool.
2. `add_tracked_keyword(keyword: "...", target_url: "...")`: after publishing. No credits. Undo: remove in the dashboard.
3. ...

### Sources
- RankScore: {tools used}. WebFetch: {URLs}. WebSearch (not RankScore data): {queries}. Firecrawl: {URLs | skipped: Firecrawl not installed}. Google Search Console: {rows | not configured}.

### Methodology
- {YYYY-MM-DD}
- {each tool call with its arguments, for example `get_keyword_serp(run_id: "...", keyword_id: "...")`}
```
