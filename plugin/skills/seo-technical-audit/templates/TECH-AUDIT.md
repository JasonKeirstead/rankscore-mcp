# Technical Audit: {domain}

> Run {YYYY-MM-DD} · RankScore site health updated {updated_at | not read}{ (older than 30 days: rerun proposed in Next steps)} · Pages crawled: {n | not in RankScore response} · Health score: {n/100 | not in RankScore response}
>
> RankScore data covers {project domain} only. {For another domain: RankScore site health, key-page traffic and next actions could not be measured; findings come from live checks only.}
> Key pages chosen from: {ranked keywords report traffic | backlink targets | homepage and navigation}.

## Summary

| Severity | Count |
|---|---|
| Critical | {n} |
| High | {n} |
| Medium | {n} |
| Low | {n} |

## Top 10 fixes (severity × pages / effort)

| Rank | Issue | Severity | Pages | Fix | Effort | Source |
|---|---|---|---|---|---|---|
| 1 | {issue name} | {severity} | {n / site-wide / ?} | {one-line fix} | {S/M/L} | {RankScore site health / curl / Firecrawl / GSC ...} |
| ... |

`site-wide` = a server- or origin-level finding, or one found on every sampled page (at least 3): counted as {n} pages ({sitemap URL count | fixed value 100, no sitemap count}). `?` = the page count is not known (counted as 1 in the score).

## By category

### Crawlability ({n} issues)
- {issue name} ({n} pages) - {fix} [{source}]

### Indexability ({n} issues)
- ...

### Security ({n} issues)
- ...

### Mobile ({n} issues)
- ...

### Structured data ({n} issues)
- ...

### Content ({n} issues)
- ...

### Performance ({n} issues)
- ...

### Modern signals ({n} findings, Firecrawl)
- {URL}: initial-HTML canonical `{X}` differs from JS-rendered canonical `{Y}` (`js_canonical_mismatch`)
- {URL}: JS-rendered `noindex` not visible in the initial HTML
- {URL}: rendered HTML is under 50% of the initial HTML size (`js_render_budget`)
- {URL}: title / H1 / meta description differ between initial HTML and rendered DOM (`js_csr_meta_drift`)
- {URL}: rendered body under 500 characters but HTTP 200 (`js_soft_404`)
- (Or: `Modern signals (JS canonical/noindex divergence, Dec-2025 JS-SEO risks): skipped, Firecrawl not installed.`)

### Crawler access and IndexNow (curl / WebFetch)
- {URL}: `X-Robots-Tag: {value}` at the HTTP layer
- robots.txt: `GPTBot` {allow / disallow `/path`}, `ClaudeBot` {...}, `PerplexityBot` {...}, `Google-Extended` {...}, `ChatGPT-User` {...}, `Bytespider` {...}, `CCBot` {...}
- IndexNow: configured {Y/N} · key file `/<key>.txt` {found / missing / mismatch} · last key rotation {YYYY-MM-DD | unknown}

### Security headers (curl)

| Header | Homepage | Page 1 | Page 2 | Page 3 | Issue |
|---|---|---|---|---|---|
| Content-Security-Policy | {present/absent} | ... | ... | ... | `csp_missing` if absent |
| X-Frame-Options | {present/absent} | ... | ... | ... | `xframe_missing` if absent (informational; CSP frame-ancestors supersedes) |
| X-Content-Type-Options | {nosniff/absent/other} | ... | ... | ... | `xcontent_missing` if not `nosniff` |
| Referrer-Policy | {present/absent} | ... | ... | ... | `referrer_policy_missing` if absent |
| Strict-Transport-Security | {present/absent · preload Y/N} | ... | ... | ... | `hsts_missing` if absent |
| HSTS preload list | {preloaded / not listed} (web lookup, hstspreload.org) | | | | `hsts_no_preload` if not listed |

HTTPS redirect: {Y/N} · Certificate expires: {YYYY-MM-DD} · Mixed content: {none | n URLs}

## Core Web Vitals (field data, CrUX)

| Metric | p75 (current) | 25-week trend | Threshold | Status |
|---|---|---|---|---|
| LCP | {n} ms | {improving/stable/degrading} | ≤2500 ms good · ≤4000 ms needs improvement | {pass/warn/fail} |
| INP | {n} ms | ... | ≤200 ms good · ≤500 ms needs improvement | ... |
| CLS | {n} | ... | ≤0.1 good · ≤0.25 needs improvement | ... |
| FCP | {n} ms | ... | ≤1800 ms good · ≤3000 ms needs improvement | ... |
| TTFB | {n} ms | ... | ≤800 ms good · ≤1800 ms needs improvement | ... |

Source: CrUX 28-day origin. If no field data: "CrUX: insufficient data for {domain} (low-traffic origin)."
(Or: `Google enrichment: not configured (run bash <plugin root>/extensions/google/install.sh)`)

## Indexation reality check (GSC URL Inspection)

| URL | Status | userCanonical → googleCanonical | Last crawled |
|---|---|---|---|
| {key page 1} | {INDEXED / EXCLUDED / ...} | {URL} {→ other URL if divergent} | {YYYY-MM-DD} |
| ... |

Source: GSC URL Inspection (tier 1). If the property is not verified: "GSC: {domain} not verified, add it in Search Console."
(Or: `Indexation reality check: not configured (tier 1 setup needed).`)

## Key-page deep dives

### {key page with most findings}
{n} findings. Top fixes:
1. ...
2. ...

Full list per page: `03-key-pages-issues.md`.

## Next steps in RankScore

Proposals only. Each runs after your yes in chat for that call. (Leave this section out for another domain: both calls act on the project domain only.)

| Call | Why | Cost | Undo |
|---|---|---|---|
| `run_site_health` `{"force_rerun": true}` | Re-check after the fixes ship (or the audit is older than 30 days) | Site-health quota (a 429 shows the limit) | Not needed; replaces the cached result |
| `dismiss_next_action` `{"rule_id": "{ruleId}"}` | "{next action title}" is fixed | Free | Not possible |

## Recommended cadence

Run this skill again monthly to catch regressions, or use seo-drift to baseline and diff between audits.

## Skipped parts

- {part}: {reason (write tools off / Firecrawl not installed / Google not configured / quota used up / another domain)}

## Methodology

| Date | Tool or command | Arguments |
|---|---|---|
| {YYYY-MM-DD} | `run_site_health` | `{}` (cached: {true/false}) |
| {YYYY-MM-DD} | `get_ranked_keywords_report` | `{}` |
| {YYYY-MM-DD} | `curl -sSI -L` | {URLs} |
| ... |
