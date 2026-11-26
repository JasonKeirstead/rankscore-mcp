# HREFLANG-REPORT.md template

Fill every `{...}`. Tag each finding with its source: `[html: Firecrawl]`, `[html: curl]`, `[html: WebFetch, degraded]`, `[sitemap]`, `[RankScore site health]`, `[RankScore articles]` or `[Google]`. Drop sections that do not apply, but keep "Coverage notes", "Skipped" and "Methodology".

````markdown
# Hreflang Audit: {domain}

> Audit date {YYYY-MM-DD} · Sample: {n} URLs · Languages found: {comma-separated list} · Inventory: {Firecrawl rawHtml | curl, no JavaScript render | WebFetch, degraded}
> RankScore data covers {project domain} only. {If another domain: "{domain} is not the project domain: RankScore sampling, the article language check and site health were not used."}

## Verdict: {PASS | NEEDS-FIX | BROKEN}{" (degraded: sitemap only)" in WebFetch mode} {or "not determined (WebFetch cannot see head link tags)"}

Reason: {1-2 sentences with concrete numbers from hreflang-issues.csv}. Return tags: {n} edges checked, {n} not checked {or "not checked"}.

## Summary

| Source | Findings | Severity breakdown |
|---|---|---|
| Per-URL HTML inventory | {n} | Critical: {n} · High: {n} · Medium: {n} · Low: {n} |
| Sitemap | {n} | ... |
| RankScore site health (cached, {updated_at}) | {n} | ... {or "skipped: {reason}"} |
| RankScore articles | {n} | ... {or "skipped: {reason}"} |
| Search Console | {n} | ... {or "not configured"} |

## Top fixes (by impact)

| # | URL | Issue | Severity | Fix |
|---|---|---|---|---|
| 1 | {URL} | {issue code} | {severity} | {one-line fix} |
| 2 | ... | ... | ... | ... |
| ... up to 10 | | | | |

## Languages found

| Language | URL count | Self-ref OK | Return tags OK | x-default OK |
|---|---|---|---|---|
| en-US | {n} | ✓ / ✗ {count} | ✓ / ✗ / not checked | ✓ / ✗ |
| de-DE | {n} | ... | ... | ... |

## Per-URL inventory ({n} URLs sampled)

| URL | Alternates | Self-ref | x-default | Canonical OK | Notable issues |
|---|---|---|---|---|---|
| {URL} | {n} | ✓/✗ | ✓/✗ | ✓/✗ | {short text} |

## Sitemap-level hreflang

- xhtml namespace declared: {✓/✗}
- URLs with hreflang alternates: {n}
- Self-reference within the sitemap: {✓ all / ✗ {count} missing}
- Return tags within the sitemap: {✓ all / ✗ {count} missing}
- Per-URL HTML vs sitemap: {✓ all match / ✗ {count} mismatched}
- Full sitemap analysis (orphans, broken entries, lastmod): see seo-sitemap.

## RankScore articles and page language

| Article | language_code | Live URL (matched by slug) | Page hreflang / html lang | Result |
|---|---|---|---|---|
| {title} | de | {URL or "not found in sitemap"} | de-DE | ✓ |

{Note if applicable: "RankScore articles exist in {languages} with no hreflang. If any are translations of each other, they need hreflang sets."}

## GSC verification of hreflang targets

| Domain | Verified | Notes |
|---|---|---|
| {domain1} | ✓ / ✗ | {note if not verified} |

(Or: `GSC verification: not configured (run bash <plugin root>/extensions/google/install.sh)`.)

## Coverage notes

- Per-URL inventory: {Firecrawl rawHtml | curl, no JavaScript render | WebFetch fallback, degraded: missing-tag checks skipped, verdict from the sitemap only}.
- Return tags: {n} edges checked in the HTML ({n} alternates fetched with `curl`, cap 30), {n} checked in the sitemap, {n} not checked ({reasons: over the cap, fetch blocked, JavaScript-injected hreflang, WebFetch mode}).
- Pages sampled: homepage + {n} pages (selection: {RankScore traffic estimate | sitemap language versions | user list}).

## Apply

- Work through `hreflang-issues.csv` row by row: each row is one change (URL, issue, fix).
- After the changes ship, run this skill again to verify.

## Next steps in RankScore

Proposals only. Each runs only after your yes in chat for that call.

| Call | What changes | Cost | Undo |
|---|---|---|---|
| `run_site_health()` | Returns the latest site audit, or starts one if none is cached. | Free when cached; otherwise site-audit quota (the catalog states no amount; HTTP 429 gives the limit and reset time) | Nothing to undo: it changes nothing on the site |
| `run_site_health(force_rerun: true)` | Runs a new site audit after the hreflang fixes ship. | Site-audit quota, as above | Nothing to undo |

{If the tool is not in the tool list: "Write tools are off (plugin setting 'Enable write tools'): turn it on, or start the audit in the dashboard."}

## Skipped

- {part}: {reason: Firecrawl not installed, no yes for run_site_health, not the project domain, Google not configured, ...}

## Methodology

- Date: {YYYY-MM-DD}
- {tool or command}: {exact arguments} (never credentials)
- ...
````
