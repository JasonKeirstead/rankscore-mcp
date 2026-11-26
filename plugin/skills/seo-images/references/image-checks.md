# Image audit rubric

> Updated 2026-05-14 with the November 2025 JPEG XL note. Mirrors AgriciDaniel/claude-seo's `seo-images` rubric (MIT), adapted to this plugin's severity scale.

This is the rubric for `seo-images`. Every issue code the skill emits maps to a row here.

## Severity scale

- **Critical**: major user-experience or traffic-loss risk. Fix today.
- **High**: significant ranking, accessibility or Core Web Vitals risk. Fix this week.
- **Medium**: quality-signal issue. Fix this month.
- **Low**: best-practice nudge. Fix when convenient.

## Effort scale

- **S**: markup edit on one template, under 1 hour.
- **M**: markup edit plus re-encoding the assets of a section, under 1 day.
- **L**: pipeline change (image CDN, build-time conversion, content rewrite at scale), several days.

---

## Alt text

| Check | Issue code | Severity | Fix | Effort |
|---|---|---|---|---|
| `alt` attribute missing | `image_alt_missing` | High | Add a descriptive alt (10-125 characters) that describes what the image shows, not the file | S |
| `alt=""` on an image whose file name or context suggests content | `image_alt_decorative_questionable` | Medium | Verify intent. If decorative (separator, hairline, pure background), keep `alt=""` and add `role="presentation"`. Otherwise add a real alt | S |
| `alt` is a bare file name (`image.jpg`, `IMG_1234.png`) | `image_alt_filename` | High | Replace with a descriptive alt | S |
| `alt` is a single generic noun (`photo`, `picture`, `image`, `banner`, `graphic`) | `image_alt_generic` | High | Replace with a descriptive alt | S |
| `alt` is CTA copy (`click here`, `read more`, `learn more`) | `image_alt_cta` | High | Move the CTA to the surrounding text; describe the image in the alt | S |
| `alt` shorter than 10 characters (not empty) | `image_alt_short` | Medium | Expand it to describe the image's content | S |
| `alt` longer than 125 characters | `image_alt_long` | Low | Shorten it: screen readers cut off around 125 characters | S |
| The same keyword token 3 or more times, or more than 50% keyword tokens | `image_alt_stuffed` | Medium | Rewrite naturally; use the keyword at most once | S |
| Identical alt on several images of one page | `image_alt_duplicate` | Medium | Templating bug: give each image its own alt | M |

### Good and bad alt examples

**Good:**
- "Professional plumber repairing a kitchen sink faucet"
- "Red 2024 Toyota Camry sedan, front three-quarter view"
- "Team of six in a modern office conference room reviewing a roadmap on a wall display"
- "Hand-drawn diagram showing the OAuth 2.0 authorisation-code flow"

**Bad:**
- `image.jpg` (file name, not a description)
- `photo` (generic noun)
- `plumber plumbing plumber services` (keyword stuffing)
- `Click here` (CTA, not a description)
- `2024_07_15_DSC_4821_edited_v2_final.png` (camera file name used as alt)

---

## File size

Thresholds by image category. Used to flag oversized images and to estimate savings when PSI data is not available.

| Image category | Target | Warning | Critical |
|---|---|---|---|
| Thumbnails (icons, avatars, list previews) | under 50 KB | over 100 KB | over 200 KB |
| Content images (body images, product photos) | under 100 KB | over 200 KB | over 500 KB |
| Hero and banner images | under 200 KB | over 300 KB | over 700 KB |

When PSI ran (step 10 of the skill), use its `wastedBytes` figures instead of these thresholds: PSI estimates the savings from the bytes actually served.

---

## Format hierarchy

| Format | Browser support (late 2025) | Use case |
|---|---|---|
| AVIF | 93%+ | Best compression for photos; preferred modern format when available |
| WebP | 97%+ | Default modern format: wider support than AVIF, smaller than JPEG |
| JPEG | 100% | Fallback for photos in a `picture` chain |
| PNG | 100% | Graphics with transparency (logos, illustrations with hard edges) |
| SVG | 100% | Icons, logos, vector illustrations; never photographs |
| GIF | 100% | Avoid for anything large; convert animated GIFs to `video` |

### Recommended `picture` pattern

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg"
       alt="Descriptive alt text"
       width="800" height="600"
       loading="lazy"
       decoding="async">
</picture>
```

The browser picks the first `source` it supports. The `img` is the universal fallback and carries `alt`, `width`, `height`, `loading` and `decoding`.

### JPEG XL note

In November 2025, Google's Chromium team reversed its 2022 decision to drop JPEG XL and announced a Rust-based decoder. The implementation is feature-complete but not yet in stable Chrome. JPEG XL offers lossless JPEG recompression (about 20% smaller, no quality loss) and competitive lossy compression. **Not yet practical in production.** Watch for the stable-channel release during 2026.

### Format issue codes

| Check | Issue code | Severity | Fix | Effort |
|---|---|---|---|---|
| JPEG or PNG with no modern `picture` alternative | `image_legacy_format` | Medium | Wrap in `picture` with AVIF and WebP `source` entries; keep JPEG or PNG as the fallback `img` | M |
| Animated GIF over 500 KB | `image_animated_gif` | Medium | Convert to `video autoplay muted loop playsinline`: far smaller, same loop | M |
| SVG used for a photograph | `image_svg_misuse` | Low | Convert to WebP or AVIF; SVG files become very large for photographs | S |
| Image above the Critical threshold for its category | `image_oversized` | Medium | Compress and convert to WebP or AVIF; check PSI `wastedBytes` for the real savings | M |

---

## Responsive sizing

| Check | Issue code | Severity | Fix | Effort |
|---|---|---|---|---|
| No `srcset` (raster image, one resolution) | `image_no_srcset` | Medium | Generate 400 / 800 / 1200 px variants; add `srcset="img-400.webp 400w, img-800.webp 800w, img-1200.webp 1200w"` | M |
| `srcset` without `sizes`, not inside `picture` | `image_no_sizes` | Medium | Add `sizes` to match the layout breakpoints, for example `sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"` | S |
| All `srcset` candidates within 100 px of each other, or `1x` only | `image_srcset_useless` | Low | Widen the range or remove `srcset`: choosing between near-identical sizes wastes the encode | S |

### Recommended `srcset` pattern

```html
<img
  src="image-800.webp"
  srcset="image-400.webp 400w, image-800.webp 800w, image-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Description"
  width="1200" height="800">
```

---

## Lazy loading and LCP

| Check | Issue code | Severity | Fix | Effort |
|---|---|---|---|---|
| LCP candidate has `loading="lazy"` | `image_lcp_lazy` | High | Remove `loading="lazy"` from the hero / LCP image. Use it only below the fold | S |
| LCP candidate has no `fetchpriority="high"` | `image_lcp_no_fetchpriority` | Medium | Add `fetchpriority="high"` to move the LCP image to the front of the network queue | S |
| Below-fold image with no `loading="lazy"` and no JavaScript loader signal | `image_below_fold_eager` | Medium | Add `loading="lazy"`, or rely on the page's JavaScript lazy-loader if it already has one | S |
| Non-LCP image without `decoding="async"` | `image_no_decoding_async` | Low | Add `decoding="async"` so decoding does not block the main thread | S |
| JavaScript loader with a placeholder `src` and no `noscript` fallback | `image_js_required` | Low | Add a `noscript` fallback or a real `src`, so crawlers that do not run the loader see the image | S |

### LCP image markup

```html
<!-- Hero / LCP image: eager, high priority, not lazy -->
<img src="hero.webp"
     alt="Hero image description"
     width="1200" height="630"
     fetchpriority="high"
     decoding="sync">
```

Use `decoding="sync"` on the LCP image, or leave the attribute out (`sync` is the default). `async` defers decoding and can delay the LCP paint.

### Lazy-loader detection

See `lazy-loaders.md` for the attribute and class taxonomy.

---

## CLS dimensions

| Check | Issue code | Severity | Fix | Effort |
|---|---|---|---|---|
| No `width` and no `height`, and no inline `aspect-ratio` | `image_unsized` | High | Set `width` and `height` to the image's intrinsic dimensions. CSS handles the responsive scaling | S |
| `width` × `height` ratio more than 5% from the displayed ratio | `image_aspect_mismatch` | Low | Match the attribute ratio to the displayed ratio, or set an `aspect-ratio` in CSS | S |

The browser uses `width` and `height` to compute the aspect ratio and reserve space before the image loads, even for responsive images. Setting them is what prevents CLS.

```html
<!-- Good: dimensions set, scales with CSS -->
<img src="photo.webp"
     alt="Description"
     width="1200" height="800"
     style="max-width: 100%; height: auto;">

<!-- Also good: aspect-ratio in CSS when dimensions vary -->
<img src="photo.webp"
     alt="Description"
     style="aspect-ratio: 3/2; width: 100%; height: auto;">
```

---

## File names

| Check | Issue code | Severity | Fix | Effort |
|---|---|---|---|---|
| Camera default (`IMG_xxxx`, `DSC_xxxx`, `DSCN_xxxx`, `P_xxxx`, `Photo_xx`) | `image_camera_filename` | Low | Rename to lowercase words with hyphens (`blue-running-shoes-side-view.webp`) before upload | S |
| Random hash (hex or base64, no readable words) together with a missing or generic alt | `image_hash_filename` | Low | If the CMS hashes names for cache busting, make the alt carry the description. Otherwise rename | S |
| All-uppercase or underscore-only name | `image_filename_style` | Low | Use lowercase with hyphens (for example `kitchen-renovation-after.webp`) | S |

**Do not flag every CDN-served image.** Many image CDNs hash file names for cache busting; that is right for caching and does not hurt SEO when the alt carries the description. The flag matters when the alt is also missing or generic.

---

## `ImageObject` JSON-LD

A top-level `ImageObject` block can make an image eligible for [licensable-image rich results](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata) in Google Images.

### Required fields

| Field | Type | Notes |
|---|---|---|
| `@context` | URL | Must be `https://schema.org` |
| `@type` | string | Must be `ImageObject` (or a subtype) |
| `contentUrl` | URL | The image file URL. **Use this, not `url`** (Google's spec); `url` is ambiguous |
| `creator` *or* `copyrightHolder` | Person or Organization | At least one is required; both is best |

### Recommended for licensable-image rich results

| Field | Type | Notes |
|---|---|---|
| `license` | URL | Page that describes the license terms (CC-BY, royalty-free, ...) |
| `acquireLicensePage` | URL | Page where users can buy or request a license |
| `creditText` | string | How the image should be credited when used |
| `copyrightNotice` | string | The copyright string (for example "© 2026 Brand Name") |
| `caption` | string | Caption that describes the image |
| `width` / `height` | Number | Intrinsic dimensions in pixels (Number, not string) |

### Common mistakes

- `url` instead of `contentUrl`. Google's spec uses `contentUrl` for the image file and `url` for the page it is on.
- `author` instead of `creator`. `ImageObject` uses `creator`; `author` belongs to `Article` / `BlogPosting`.
- `creator` as a bare string instead of a `Person` or `Organization` object. Always nest:
  ```json
  "creator": { "@type": "Organization", "name": "Brand Name" }
  ```
- `width` / `height` as strings. Use `1200`, not `"1200"`.
- Marking up images that are not visible on the page. Google penalises hidden-content schema.

See `../templates/image-object.json` for a paste-ready block.

---

## What matters and what does not for Google Images

| Factor | Impact | Where to set it |
|---|---|---|
| Alt text | **Critical** (ranking) | the `alt` attribute of `img` |
| File name | High (secondary ranking signal) | File system (descriptive, hyphens, lowercase) |
| Page context (surrounding text) | High (ranking) | Body copy near the image |
| File size and page speed | Medium (indirect, through Core Web Vitals) | Compression and format conversion |
| `ImageObject` `creator` / `copyrightNotice` | Low (display only: licensable-image rich results) | JSON-LD on the page |
| EXIF camera data (camera model, GPS, ...) | None | Strip on upload: privacy leak, no SEO value |
| IPTC `Keywords` field | None | Google ignores it |

The skill weights the remediation list by these factors.

---

## Optimisation pipeline (out of scope for the skill)

The skill audits markup. Converting and re-encoding the image files is engineering work. If the user wants a pipeline, the usual recipe is:

```bash
# WebP (preferred default, metadata kept)
cwebp -q 82 -metadata all input.jpg -o output.webp

# AVIF (better compression, slower encode)
ffmpeg -i input.jpg -c:v libaom-av1 -crf 30 -still-picture 1 output.avif

# Responsive width variants
for w in 400 800 1200; do
  convert input.jpg -resize ${w}x -quality 82 "image-${w}.webp"
done

# IPTC and XMP credits for licensable-image rich results (Google Images shows them)
exiftool \
  -IPTC:By-line="Brand Name Photography" \
  -IPTC:CopyrightNotice="Copyright 2026 Brand Name" \
  -XMP:Creator="Brand Name Photography" \
  -XMP:Rights="Copyright 2026 Brand Name" \
  image.jpg
```

**WebP supports EXIF and XMP but not IPTC.** For WebP files use the XMP fields; `exiftool` converts automatically when it writes to `.webp`.

For automated pipelines, an image CDN (Cloudinary, imgix, Cloudflare Images, Vercel Image Optimization, Next.js `Image`) does the conversion, the responsive variants and the `picture` markup at request time. Recommend an image CDN over manual conversion for sites with more than 100 content images.
