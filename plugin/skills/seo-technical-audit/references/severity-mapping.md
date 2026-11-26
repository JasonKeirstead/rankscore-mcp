# Audit finding severity mapping

> Updated 2026-05-01 with IndexNow, extended security headers and Dec-2025 JS-SEO risks, for parity with AgriciDaniel/claude-seo (MIT).

Maps findings to severity, suggested fix and effort. `seo-technical-audit` uses it to score severity × affected pages / effort and to build the top-10 fix list. Findings come from two places:

- The RankScore site-health audit (`run_site_health` `fixes[]` and `summary`) and the dashboard's technical next actions (`get_next_actions`). These items have no confirmed issue codes: match them to a row below by name or description.
- The skill's own live checks (curl, WebFetch, Firecrawl, CrUX, GSC). These use the issue codes in the tables.

A finding that matches no row is marked `unmapped`. Give it a severity from the scale definitions and an effort from the effort scale, and say so in `issues.csv`.

## Severity scale

- **Critical**: site-breaking, or can lose major traffic. Fix today.
- **High**: significant ranking or indexation risk. Fix this week.
- **Medium**: quality-signal issue. Fix this month.
- **Low**: best-practice nudge. Fix when convenient.

## Effort scale

- **S**: config or template change, under 1 hour.
- **M**: content or template work across several pages, under 1 day.
- **L**: engineering work or content rewrite at scale, several days.

## Mapping

### Crawlability

| Issue | Severity | Fix | Effort |
|---|---|---|---|
| robots.txt blocking important resources (CSS/JS/images) | Critical | Allow CSS, JS and image directories in robots.txt | S |
| robots.txt 5xx error | Critical | Fix server config; robots.txt must return 200 or 404 (never 5xx) | S |
| XML sitemap missing | High | Generate and submit a sitemap; reference it in robots.txt | M |
| XML sitemap not in robots.txt | Medium | Add a `Sitemap:` line to robots.txt | S |
| JS rendering blocking critical content | High | Server-side render critical content; make it crawler-accessible | L |
| Crawl depth >5 for important pages | Medium | Add internal links from higher-traffic pages | M |
| Internal redirect chain >2 hops | Medium | Update internal links to the final destination | S |

### Indexability

| Issue | Severity | Fix | Effort |
|---|---|---|---|
| Important page noindexed | Critical | Remove `noindex` from meta robots and X-Robots-Tag | S |
| Canonical points to a different URL than self | High | Fix the canonical to self-reference, or confirm the consolidation is intended | S |
| Canonical to a 404 page | Critical | Update or remove the canonical | S |
| Multiple canonicals on one page | High | Keep one canonical tag | S |
| Hreflang return-tag mismatch | Medium | Each hreflang variant must point back to the original | M |
| Pagination noindexed (when it should not be) | Medium | Self-canonical paginated pages and keep them indexable | S |
| Orphan pages (no internal links) | Medium | Add internal links from relevant parent pages | M |

### Security

| Issue code | Issue | Severity | Fix | Effort |
|---|---|---|---|---|
| `http_not_https` | HTTP page (not HTTPS) | Critical | Redirect HTTP → HTTPS site-wide; update internal links | M |
| `mixed_content` | HTTPS page loading HTTP resources | High | Change resource URLs to HTTPS | S |
| `hsts_missing` | Missing HSTS header | Medium | Add a `Strict-Transport-Security` header | S |
| `cert_expired` | Expired or self-signed certificate | Critical | Renew the certificate with the CA | S |
| `domain_mixed_case` | Mixed-case domain in canonical | Low | Normalise to lowercase | S |
| `csp_missing` | Content-Security-Policy header absent | Medium | Define a CSP (start report-only, then enforce) | M |
| `xframe_missing` | X-Frame-Options header absent | Low | Add `X-Frame-Options: SAMEORIGIN` (informational; CSP `frame-ancestors` supersedes) | S |
| `xcontent_missing` | X-Content-Type-Options not `nosniff` | Low | Add `X-Content-Type-Options: nosniff` | S |
| `referrer_policy_missing` | Referrer-Policy header absent | Low | Add `Referrer-Policy: strict-origin-when-cross-origin` (or stricter) | S |
| `hsts_no_preload` | HSTS present but no `preload` directive and the domain is not on the Chromium HSTS preload list | Low | Add `preload` (`max-age≥31536000; includeSubDomains; preload`) and submit to hstspreload.org | S |

### Mobile

| Issue | Severity | Fix | Effort |
|---|---|---|---|
| Viewport meta missing | High | Add `<meta name="viewport" content="width=device-width, initial-scale=1">` | S |
| Tap targets too small | Medium | Make buttons and links at least 44×44 px | S |
| Text too small to read | Medium | Set the base font size to 16px or more | S |
| Content wider than screen | Medium | Fix the responsive layout; avoid fixed widths | M |

### Structured data

| Issue | Severity | Fix | Effort |
|---|---|---|---|
| Schema parse error | High | Fix the JSON-LD syntax (commas, quotes, braces) | S |
| Required field missing | High | Add the required field per the `schema.org` spec for the type | S |
| Schema describes hidden content | Medium | Remove the schema or make the content visible | S |
| Multiple competing types on one page | Low | Use one primary `@type` per `<script>` block | S |

### Content

| Issue | Severity | Fix | Effort |
|---|---|---|---|
| Title tag missing | Critical | Add a unique, descriptive `<title>` of 50-60 chars | S |
| Title tag duplicate across pages | High | Make each title unique | M |
| Title tag too long (>60 chars) | Low | Trim to 50-60 chars; keep the keyword in the first 50 | S |
| Meta description missing | Medium | Add a 150-160 char description | S |
| Meta description duplicate across pages | Medium | Make each one unique | M |
| H1 missing | High | Add exactly one descriptive H1 per page | S |
| Multiple H1s | Medium | Keep one H1; change the others to H2 | S |
| H2-H6 hierarchy skips levels | Low | Use levels in order (H1 → H2 → H3) | S |
| Thin content (<300 words) on an indexable page | Medium | Expand, or noindex/consolidate | M |
| Duplicate content (>80% similar across pages) | High | Consolidate and canonical to the primary, or differentiate | L |

### Performance

| Issue | Severity | Fix | Effort |
|---|---|---|---|
| Slow LCP (>2.5 s on mobile) | High | Optimise the hero image; reduce render-blocking JS | L |
| Slow INP (>200 ms) | High | Reduce main-thread blocking; defer non-critical JS | L |
| Layout shift (CLS >0.1) | Medium | Set width and height on images; reserve space for ads | M |
| Render-blocking JS in head | Medium | Defer or async non-critical scripts | S |
| Uncompressed images | Medium | Compress and convert to WebP/AVIF | M |
| Missing caching headers | Low | Add `Cache-Control` to static assets | S |

### JS rendering (Dec-2025 risks)

Per Google's December 2025 JavaScript SEO guidance: four risks that a static fetch or crawl cannot see, because it does not run JavaScript. Step 7 of `SKILL.md` finds them with Firecrawl by comparing the initial HTML (curl) with the rendered DOM.

| Issue code | Issue | Severity | Fix | Effort |
|---|---|---|---|---|
| `js_render_budget` | Rendering-budget cut: rendered HTML is under 50% of the initial HTML size (Google may stop rendering before the main content loads) | High | Server-side render or pre-render critical content; shrink the JS bundle so the first paint holds the indexable content | L |
| `js_canonical_mismatch` | Hydration mismatch: the rendered canonical differs from the initial-HTML canonical (Google may use either) | High | Same canonical in the initial HTML and after hydration; never inject the canonical client-side | M |
| `js_csr_meta_drift` | CSR pitfall: rendered title / H1 / meta description differ from the initial HTML (Google may index the initial values) | High | Serve the final title, H1 and meta description in the server-rendered HTML | L |
| `js_soft_404` | Soft-404 from JS errors: rendered body under 500 chars with HTTP 200 (JS probably failed; Google sees an empty page) | Critical | Return a real 404 when content is missing; add an SSR fallback so failed JS does not leave a 200 with no body | M |

### IndexNow

Used by Bing, Yandex and Naver; Google does not use IndexNow. Low severity by default (Bing-only benefit), but a configuration mismatch is Medium because it advertises the wrong key to crawlers.

| Issue code | Issue | Severity | Fix | Effort |
|---|---|---|---|---|
| `indexnow_no_key` | No `/<key>.txt` key file found | Low | Generate an IndexNow key, host it at `/<key>.txt` and use it in submissions (Bing-only benefit; informational for Google-focused sites) | S |
| `indexnow_key_mismatch` | `/<key>.txt` content differs from the key advertised in the `x-indexnow-key` header or robots.txt hint | Medium | Sync the file with the advertised key; rotate it if exposed | S |
| `indexnow_not_submitted_recently` | Key present but no sign of recent submissions | Low | Submit URLs automatically on publish and update (informational) | S |

## Priority scoring

`priority_score = severity_weight × affected_pages / effort_weight`

- severity_weight: Critical=5, High=3, Medium=1, Low=0.5
- effort_weight: S=1, M=3, L=5
- affected_pages: the count from the RankScore finding or the number of URLs the live checks found.
- Site-wide findings: a finding at server or origin level (robots.txt, HTTPS redirect, certificate, CrUX origin LCP/INP/CLS) or found on every sampled page (at least 3 sampled) is site-wide. Its affected_pages is the sitemap URL count from step 6 of `SKILL.md`, or 100 when there is no count. Show `site-wide` in the Pages column and state the rule and the number in the deliverable. Without this rule, live checks on 4-5 sampled pages would score a site-wide issue like a one-page issue.
- Otherwise, when the count is not known, use 1 and show `?`.

The top-10 fixes are the highest priority_score values across all categories, plus any Critical elevation from GSC (step 9 of `SKILL.md`).
