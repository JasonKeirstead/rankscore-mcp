# RankScore field mapping for schema pre-fill

Use this in step 5 of `seo-schema`. RankScore data covers the user's own project only. The live page always wins: schema must describe what the page shows. Where a RankScore value and the page differ, use the page value and record the difference in `02-recommended.md`.

## Article (from `get_article`, `format: "html"`)

| Schema.org property | RankScore field | Notes |
|---|---|---|
| `headline` | `title` | At most 110 characters. Use the live `h1` / `title` if it was edited after generation. |
| `description` | `meta_description` | Fall back to `excerpt` if empty. |
| `image` | `hero_image_url` | Google wants at least 1200×800 px. Check the size on the live page; if unknown, say so. |
| `datePublished` | `created_at` | Convert to ISO 8601. `created_at` is when RankScore generated the article, not necessarily when it was published. Prefer the date the page shows. |
| `inLanguage` | `language_code` | |
| `keywords` | `keyword`, `keywords` | Comma-separated. No rich-result effect; optional. |
| `mainEntityOfPage` | (none) | The live canonical URL. `project_url` plus `slug` is only a guess: confirm it against the fetched page. |
| `author` | (none) | From the page byline, else `{REPLACE: ...}`. |
| `publisher.name` | `get_ai_visibility` → `config.brand_name`, or `get_listing` business name | |
| `publisher.logo` | (none) | From the page, else `{REPLACE: ...}`. |
| `dateModified` | (none) | From the page, else `{REPLACE: ...}`. |

`content_html` is the article body. Use it to find visible Q&A blocks (FAQPage) and the body images (`seo-images` article mode). It does not contain the theme's header, breadcrumbs or footer.

## LocalBusiness (from `get_listing`)

The catalog describes the listing fields by meaning, not by exact key: read the keys that come back and map them as below.

| Schema.org property | Listing field | Notes |
|---|---|---|
| `@type` | primary category | The most specific Schema.org `LocalBusiness` subtype that fits (for example `Dentist`, `Restaurant`, `Plumber`, `AutoRepair`). Fall back to `LocalBusiness`. Secondary categories do not change `@type`. |
| `name` | business name | |
| `telephone` | phone | International format: `+`, country code, digits, no spaces. |
| `email` | email | |
| `url` | website | |
| `description` | description (only once the page shows it) | From the page (visible about text, else the meta description). If the page has none, keep `{REPLACE: ...}` or leave it out (not required). A listing description that the page does not show can go into schema only once it is published on the page. Only when neither the page nor the listing has one, propose `generate_listing_description` (it returns draft text and saves nothing) to draft text for the listing or the page: the draft goes into schema only after it is published on the page. Never propose it when the page already shows a description. |
| `address` | address | `PostalAddress`: `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry` (ISO 3166-1 alpha-2). |
| `openingHoursSpecification` | hours | One `OpeningHoursSpecification` per group of days with the same `opens` / `closes` (24-hour `HH:MM`). |
| `geo` | (none) | Not in the listing. `{REPLACE: ...}` or leave it out (recommended, not required). |
| `image` | (none) | From the page. |
| `priceRange` | (none) | From the page, or leave it out. |
| `@id` | (none) | Canonical URL of the location page. |

The listing also returns a status and a sync state. If the listing is not live, its values may differ from the public business profile. The schema must match the visible page and the business profile, so cross-check before shipping.
