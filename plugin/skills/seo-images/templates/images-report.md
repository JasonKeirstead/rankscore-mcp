# IMAGES.md template

Fill every `{...}`. Tag each finding with its source: `[page: Firecrawl]`, `[page: curl]`, `[RankScore article]`, `[RankScore site health]` or `[Google PSI]`. Drop sections that do not apply, but keep "Skipped" and "Methodology".

````markdown
# Image SEO Audit: {URL, domain or article title}

> Snapshot dated {YYYY-MM-DD} · Mode: {URL | domain sample ({n} pages) | RankScore article} · Images analysed: {n} · HTML source: {Firecrawl rawHtml | curl, no JavaScript render | RankScore article HTML}
> RankScore data covers {project domain} only. {If another domain: "{domain} is not the project domain: RankScore sampling, article mode, credit pre-fill and site health were not used."}

## Verdict

{One or two sentences: the biggest risk and the top fix, with numbers. Example: "The hero image is lazy-loaded (LCP risk) and 14 of 22 images are legacy JPEG with no modern alternative (2.1 MB PSI savings)."}

## Coverage at a glance

| Metric | Result |
|---|---|
| Total images | {n} |
| Missing alt text | {n} ({pct}%) |
| Generic or templated alt text | {n} ({pct}%) |
| Modern format (WebP / AVIF) coverage | {pct}% direct, {pct}% through a `picture` fallback |
| `srcset` present (responsive) | {pct}% {or "verify on live page (article mode)"} |
| Lazy-loading method | native: {pct}% · JavaScript loader: {pct}% · none: {pct}% {or "verify on live page (article mode)"} |
| LCP image flagged | {yes / no: element and risk} {or "verify on live page (article mode)"} |
| Unsized (CLS risk) | {n} ({pct}%) {or "verify on live page (article mode)"} |
| `ImageObject` JSON-LD | {present / partial / missing} |

## Top 10 fixes (severity, then byte savings)

| Rank | Issue code | Severity | Images | PSI wastedBytes | Fix | Effort |
|---|---|---|---|---|---|---|
| 1 | image_lcp_lazy | High | 1 | 480 KB | Remove `loading="lazy"`; add `fetchpriority="high"` | S |
| 2 | image_legacy_format | Medium | 14 | 2.1 MB | Convert to WebP; wrap in `picture` with a fallback | M |
| ... | | | | | | |

{Article mode only:} **Verify on the live page:** `srcset` / `sizes`, `width` / `height`, `loading`, `decoding`, LCP and `fetchpriority`. The CMS and theme add these when they render the page, so the article HTML cannot show them. Run this skill in URL mode on the published page.

## By category

### Alt text ({n} issues)
- {n} images with no `alt`. See `02-remediation/alt-text-rewrites.md`.
- {n} images with generic alt (`image.jpg`, `photo`, "click here").
- {n} images that share one alt (templating bug).

### Format coverage ({pct}% modern)
- {n} images on legacy JPEG / PNG. See `02-remediation/picture-snippets.md`.
- {n} animated GIFs over 500 KB: use video.

### Responsive sizing ({pct}% have `srcset`)
- {n} images without `srcset`.
- {n} images with `srcset` but no `sizes`.

### Lazy loading and LCP
- LCP candidate: `{img src or selector}`: {risk}. {PSI confirmed / overruled it, or "heuristic only"}
- {n} below-fold images load eagerly.
- {n} images without `decoding="async"`.

### CLS dimensions ({n} unsized)
- {n} images without `width` / `height`.
- {n} images with an aspect-ratio mismatch.

### File names ({n} flagged)
- {n} camera-default names (`IMG_xxxx`).
- {n} hash-only names with a missing or generic alt.

### ImageObject JSON-LD
- Present: {none | on the hero | partial}.
- Recommended: {none | hero-image ImageObject for licensable-image rich results}. Credits: {`{REPLACE: ...}`, ownership not confirmed | filled from the RankScore listing or brand name after the user confirmed the brand owns the image | from the page}.
- **Confirm image ownership** before you publish this block. `creator`, `copyrightHolder`, `copyrightNotice`, `creditText` and `license` state who made and owns the image. Do not fill them with the brand for stock, licensed, user-generated or AI-generated images: use the real creator and licence, or leave the block out.

### Site health cross-check {or "skipped: {reason}"}
- {n} image issues from the cached RankScore site audit (dated {updated_at}) [RankScore site health].
- Site-health pages not in this sample: {list}.

## Paste-ready fixes

See `02-remediation/`:
- `picture-snippets.md`: `picture` blocks for the top legacy-format images.
- `alt-text-rewrites.md`: rewrites for missing and generic alts.
- `image-object.jsonld`: `ImageObject` block for the hero image.

## Out of scope

- **File-level optimisation** (running `cwebp`, `exiftool`, ImageMagick or `ffmpeg` on the files). This audit covers markup; see `references/image-checks.md`, "Optimisation pipeline", for a starting recipe.
- **CSS background images.** {n} likely background images found but not audited. They do not appear in Google Images.
- **More than 10 pages.** This is a sample. For every image on every page, run `seo-technical-audit` first.
- **Theme markup in article mode.** The hero, `srcset` / `sizes`, `width` / `height`, `loading` and `decoding` that the CMS adds at publish are not in RankScore article HTML.

## Next steps in RankScore

Proposals only. Each runs only after your yes in chat for that call.

| Call | What changes | Cost | Undo |
|---|---|---|---|
| `run_site_health()` | Returns the latest site audit, or starts one if none is cached. | Free when cached; otherwise site-audit quota (the catalog states no amount; HTTP 429 gives the limit and reset time) | Nothing to undo: it changes nothing on the site |
| `run_site_health(force_rerun: true)` | Runs a new site audit after the fixes ship, to confirm them. | Site-audit quota, as above | Nothing to undo |

No RankScore tool can change article images or alt text: make those fixes in the CMS.
{If the tool is not in the tool list: "Write tools are off (plugin setting 'Enable write tools'): turn it on, or start the audit in the dashboard."}

## Recommended next skills

- {seo-technical-audit, if image issues need counting across the whole site.}
- {seo-schema, if the page also needs Article, Product or LocalBusiness schema.}
- {seo-google, for the full PageSpeed report (this skill reads only the image audits).}

## Skipped

- {part}: {reason: Firecrawl not installed, curl blocked, not the project domain, PSI not configured, no yes for run_site_health, ...}

## Methodology

- Date: {YYYY-MM-DD}
- {tool or command}: {exact arguments} (never credentials or API keys)
- ...
````
