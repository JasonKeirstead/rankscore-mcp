# Hreflang validation rules

Load this reference when you apply validation in step 5 (per-URL inventory), step 6 (sitemap), step 7 (RankScore articles) or step 8 (Search Console). Each row is one rule: what triggers it, its severity, the suggested fix and the sources it can come from.

Sources: `html` (page HTML), `sitemap` (XML sitemap), `site-health` (RankScore `run_site_health`, only when it reports the issue), `rankscore` (RankScore article data compared with the live page), `gsc` (Search Console).

## Rule table

| Issue code | Severity | Detection (what triggers it) | Suggested fix | Source |
|---|---|---|---|---|
| `hreflang_no_self_reference` | Critical | A page emits hreflang alternates but its own URL is not in the set. | Add `link rel="alternate" hreflang="{lang}" href="{this-page-url}"` for the page's own language. | html, sitemap, site-health |
| `hreflang_missing_return_tag` | Critical | Page A lists page B as an alternate, but page B does not list page A back. In HTML, only when both pages were read with Firecrawl or `curl`; otherwise the edge is `not checked`. | Add the reciprocal alternate link on page B pointing to page A. | html, sitemap, site-health |
| `hreflang_missing_x_default` | High | The set has language alternates but no `hreflang="x-default"` entry. | Add one `link rel="alternate" hreflang="x-default" href="{fallback-url}"` per set. The fallback is usually the language selector page or the English version. | html, sitemap, site-health |
| `hreflang_invalid_lang_code` | High | The `hreflang` value is not a valid ISO 639-1 language code (optionally followed by `-` and an ISO 3166-1 alpha-2 region). | Use the correct code. Common errors: `eng` → `en`, `jp` → `ja`, `zh` → `zh-Hans` or `zh-Hant`. | html, sitemap, site-health |
| `hreflang_invalid_region_code` | High | The region part is not a valid ISO 3166-1 alpha-2 code, or has the wrong case. | Use the correct region. Common errors: `en-uk` → `en-GB`; `es-LA` → specific countries (`es-MX`, `es-AR`). Format: lowercase language, uppercase region. | html, sitemap, site-health |
| `hreflang_canonical_mismatch` | High | A page emits hreflang but its `link rel="canonical"` points to a different URL, or Google chose a different canonical. | Move hreflang to the canonical page, or make the canonical point to this page. Google ignores hreflang on a non-canonical page. | html, site-health, gsc |
| `hreflang_conflict` | High | The same hreflang value (for example `de-DE`) is used by more than one distinct URL in the same set. | Pick one URL per language-region. Google ignores conflicting sets entirely. | html, sitemap, site-health |
| `hreflang_article_language_mismatch` | High | A RankScore article's live page declares a self-referencing hreflang (or `html lang`, when it has no hreflang) whose language differs from the article's `language_code`. | Correct the page's hreflang value and `html lang` to the article's language, or correct the language setting in the CMS template. | rankscore |
| `hreflang_protocol_mismatch` | Medium | URLs in the same set mix HTTP and HTTPS. | Use HTTPS everywhere. After an HTTPS migration, update every hreflang `href`. | html, sitemap |
| `hreflang_trailing_slash_mismatch` | Medium | The hreflang `href` differs from the canonical only by a trailing slash. | Match the canonical exactly, including the trailing slash. | html, sitemap |
| `hreflang_html_sitemap_mismatch` | Medium | The set in the sitemap does not match the set in the page HTML for the same URL. | Pick one source of truth (the sitemap is preferred for sites with more than 50 language variants per page). Remove the other or keep them in sync. | html and sitemap compared |
| `hreflang_target_unverified_gsc` | Medium | A target domain in the hreflang set is not verified in Search Console for the configured credentials. | Verify the domain in Search Console. Google recommends verification of every domain in a cross-domain setup. | gsc |
| `hreflang_xhtml_namespace_missing` | Medium | The sitemap contains `xhtml:link` elements but the root `urlset` does not declare `xmlns:xhtml="http://www.w3.org/1999/xhtml"`. | Add the namespace declaration to `urlset`. | sitemap |
| `hreflang_language_without_region` | Low | The value is a language only (for example `es`) on a page that is clearly aimed at one country (for example it mentions only Spain). | If geo-targeting is intended, add the region (`es-ES`). If not, leave it: language-only is a valid choice. | html, sitemap |
| `hreflang_dual_implementation` | Low | The site emits hreflang in both the HTML and the sitemap. Not invalid, but it doubles maintenance and risks `hreflang_html_sitemap_mismatch`. | Pick one. The sitemap is preferred above 50 language variants per page; HTML is fine for smaller sites. | html and sitemap compared |

## Severity definitions (used by the verdict in step 9)

- **Critical**: the whole hreflang set is invalid; Google ignores it. PASS is not possible while any Critical exists.
- **High**: the set works but is wrong in a way that costs traffic in the affected market. NEEDS-FIX threshold.
- **Medium**: the set works but is sloppy. Likely to break with the next deploy that touches URLs.
- **Low**: best-practice nudge. No traffic impact today.

## Detection notes

- **Self-reference (`hreflang_no_self_reference`):** match by URL string (case-insensitive). If the page is `https://example.com/fr/page` and its set lists `hreflang="fr" href="https://example.com/fr/page"`, that is a valid self-reference.
- **Return tags (`hreflang_missing_return_tag`):** for each (page → alternate) edge in the per-URL inventory or the sitemap, check that the reverse edge exists. In the HTML, check an edge only when the alternate's HTML was read too (step 5 fetches up to 30 alternates with `curl`). An edge whose target was not read is `not checked`: count it, but never report it as a missing return tag. Pairwise checks are fine for small sets; for large sets, build a map of URL → set of alternates and look up each edge.
- **WebFetch markdown:** it often drops `head` link tags, the canonical and `html lang`. Never raise `hreflang_no_self_reference`, `hreflang_missing_return_tag`, `hreflang_missing_x_default` or `hreflang_canonical_mismatch` because a tag is absent from WebFetch output. The verdict then comes from the sitemap only.
- **Language-region codes:** ISO 639-1 is two letters (`en`, `fr`, `de`, `ja`, `zh`). ISO 3166-1 alpha-2 is two letters (`US`, `GB`, `DE`, `BR`). The combined value is lowercase language, `-`, uppercase region (`en-GB`, `de-AT`, `pt-BR`). `x-default` is the only special value.
- **Canonical alignment (`hreflang_canonical_mismatch`):** strict string match. Trailing slash, scheme and case all matter. With Search Console, `canonical.google_canonical` from `gsc_inspect.py` shows Google's own choice.
- **Conflicts (`hreflang_conflict`):** two distinct URLs that both claim `hreflang="de-DE"` is the textbook case. Less obvious: one page that lists `de-DE` and `de-AT` with the same URL. That is not a conflict (different values), but it suggests the German targeting is muddled.
- **Article language (`hreflang_article_language_mismatch`):** compare only the language part (`de` of `de-AT`) with `language_code`. The live URL comes from matching `slug` to the sitemap; when no match is found, do not raise the issue, list the article as `not found in sitemap`.

## What this skill does not validate

The upstream AgriciDaniel/claude-seo `seo-hreflang` skill also covers cultural adaptation, content parity, locale formatting and word-count ratios. Those are translation-quality questions. This skill checks only whether the hreflang signal itself is technically correct. For a broader localisation review, send the user to their translation or localisation team: Claude cannot reliably judge cultural fit without locale expertise that this skill's data does not capture.
