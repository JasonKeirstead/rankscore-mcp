# SCHEMA.md template

Fill every `{...}`. Tag each finding with its source: `[page: Firecrawl]`, `[page: curl]`, `[RankScore]`, `[WebSearch stand-in]` or `[Google]`. Never present a WebSearch stand-in as RankScore data. Drop sections that do not apply, but keep "Skipped" and "Methodology".

````markdown
# Schema Markup: {URL}

> Snapshot dated {YYYY-MM-DD} · HTML source: {Firecrawl rawHtml | curl, no JavaScript render | none: generate-only}
> RankScore data covers {project domain} only. {If another domain: "{domain} is not the project domain: RankScore pre-fill and the RankScore result list were not used."}

## Verdict

{n} JSON-LD blocks found: {n} valid, {n} with errors. {n} types recommended. {n} `{REPLACE: ...}` placeholders left to fill.
Top action: {one sentence}.

## Currently present

- `Article`: valid ✓ [page: Firecrawl]
- `BreadcrumbList`: invalid ✗ (missing `position` on item 2) [page: Firecrawl]
- JavaScript-only blocks: {none | list} (present in the render, absent from the server HTML)
- Legacy markup: {none | Microdata / RDFa on ...}
- Google last saw: {types and issues from Search Console URL inspection, with the crawl date} [Google] {or "not configured"}

## Recommended additions

- `FAQPage`: the page has 6 visible Q&A blocks but no FAQ schema. FAQ rich results are limited to government and health sites (see `references/google-rich-results.md`), so expect no SERP uplift.
- `LocalBusiness`: pre-filled from the RankScore listing [RankScore]. `geo` is a placeholder (not in the listing).
- `Article`: headline, description, image and language from the RankScore article [RankScore]; author and publisher logo from the page [page: Firecrawl].
- ...

## Paste these into the `head` of the page

### FAQPage

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [...]
}
</script>
```

### ... (one per generated block)

## Validation pass

- All generated blocks parse cleanly ✓
- Required fields filled: {n} `{REPLACE: ...}` placeholders remain:
  - `article.jsonld` → `image` (need a hero image URL of at least 1200×800)
  - ...
- RankScore values that differ from the page (page value used): {list or "none"}
- Rich-result statuses: {reference file verified {date}, less than 6 months old | checked against Google's Search Gallery on {date}: {types} still listed | not checked (fetch failed): reference file last verified {date}, verify before shipping}

## Benchmark: {RankScore SERP from discovery run {run_id}, {date} | WebSearch stand-in, not Google's top 10 | skipped: {reason}}

Keyword: {keyword} · Pages read: {n} of {n}

| Type | Pages using it | On this page |
|---|---|---|
| `BreadcrumbList` | 8 / 10 | ✗ |
| ... | | |

## Install

1. Copy each `script` block above.
2. Paste it into the `head` of the page (or the global `head` template, limited to that page type).
3. Test with [Google's Rich Results Test](https://search.google.com/test/rich-results).
4. Ask Search Console to recrawl the URL if the change is important.

## Next steps in RankScore

Proposals only. Each runs only after your yes in chat for that call.

| Call | What changes | Cost | Undo |
|---|---|---|---|
| `generate_listing_description({exact arguments, filled from get_listing})` | Returns draft text for the listing or the page. Saves nothing. Proposed only because neither the page nor the listing has a description. The text can go into `LocalBusiness.description` only after it is published on the page. | Job tool: the catalog states no amount; a refusal (HTTP 429) gives the limit and reset time | Nothing to undo |

{Or: "None. No RankScore tool can store schema in an article, the listing or the CMS."}
{If the tool is not in the tool list: "Write tools are off (plugin setting 'Enable write tools'): the arguments above let you do this in the dashboard."}

## Skipped

- {part}: {reason: Firecrawl not installed, curl blocked, not the project domain, Google not configured, keyword not in any discovery run, ...}

## Methodology

- Date: {YYYY-MM-DD}
- {tool}: {exact arguments} (never credentials)
- ...
````
