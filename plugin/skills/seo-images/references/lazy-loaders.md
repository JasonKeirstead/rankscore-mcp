# Lazy-loader detection

> Taxonomy adapted from AgriciDaniel/claude-seo's `seo-images` skill (MIT). Five recognised mechanisms.

Classify each `img`'s lazy-loading mechanism from its attribute names and class signals. Report the result as `lazy_method` next to `loading` in `images.csv`, so a page that uses a JavaScript loader is not flagged for a missing `loading="lazy"`.

## Detection table

| `lazy_method` | Signal | Common stack |
|---|---|---|
| `native` | `loading="lazy"` HTML attribute | Modern browsers, plain HTML, most CMSes since 2022 |
| `perfmatters` | `data-perfmatters-src` or `data-perfmatters-srcset` attribute, or `class` contains `perfmatters-lazy` | WordPress with the Perfmatters plugin |
| `ewww` | `data-ewww-src` or `data-eio` attribute, or `class` contains `lazyload-eio` | WordPress with EWWW Image Optimizer |
| `js-generic` | Any of `data-src`, `data-lazy-src`, `data-original`, `data-srcset`, or `class` contains `lazyload` / `lazyloaded` / `lazy` | Lazysizes, vanilla-lazyload, jQuery LazyLoad, custom scripts |
| `none` | No attribute or class signal | The page does not lazy-load this image |

## Detection order

Evaluate from top to bottom. A `native` signal wins over a `js-generic` signal because native lazy loading is the browser's own behaviour. A page with both `loading="lazy"` and `data-src` almost certainly runs both mechanisms in parallel (modern CMSes do this for browser compatibility): report `native` and note "JavaScript loader fallback also present" in the evidence.

## What the audit does with each

- `native`: counts toward the lazy-loaded percentage. No fix needed, unless the image is the LCP candidate (then `image_lcp_lazy`).
- `perfmatters` / `ewww` / `js-generic`: count toward the lazy-loaded percentage **through a JavaScript loader**. Do not flag the image for a missing `loading="lazy"`; the loader handles it. Relevant findings:
  - `loading="lazy"` also present: modern best practice (progressive enhancement). No flag.
  - The loader needs JavaScript to show the image at all (no `noscript` fallback and a placeholder `src`): flag `image_js_required` (Low). Crawlers may not see the real image.
- `none`: for below-fold images this is `image_below_fold_eager`. For above-fold and LCP images it is correct.

## Edge cases

- **Cloudinary or imgix `img` with `data-cld-*` or `data-imgix-*` attributes.** These configure the CDN's JavaScript plugin; they are not lazy loading. Do not classify them as `js-generic`. Treat them as `native` if `loading="lazy"` is also set, else `none`.
- **`picture` with lazy sources.** The lazy attribute belongs to the inner `img`. Detect it on the `img`, not on `picture` or `source`.
- **Mixed WordPress themes.** Some themes lazy-load with one mechanism and run Perfmatters on top, so both `data-perfmatters-src` and `data-src` appear. Report the more specific one (`perfmatters` over `js-generic`).
- **Intersection-observer scripts** with no `data-*` attribute (some frameworks inject `src` from a `noscript` element when the image scrolls into view). These are hard to detect without runtime data. If `src` is a placeholder (`data:image/svg+xml...`, `placeholder.png`, a transparent 1×1), classify it as `js-generic`.
- **`curl` HTML (no JavaScript render).** Loader attributes are visible in the server HTML, so classification still works. Images that the loader would create from scratch are missing.

## Why this matters

`loading="lazy"` is supported everywhere now, but many production sites still use a JavaScript loader as the main mechanism: for control over the load offset, for lazy `picture` sources (native lazy loading does not reach them), or for older themes. Flagging those images as "missing lazy loading" sends engineers after a bug that does not exist.
