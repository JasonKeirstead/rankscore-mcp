# Intent to template map (8 templates)

> Adapted from `AgriciDaniel/claude-seo`'s `seo-cluster/references/hub-spoke-architecture.md` (MIT), via SE Ranking seo-skills (MIT).

Use this map at brief time to classify the article against one of 8 templates. The choice rests on the page-type majority of the top 10 results (`get_keyword_serp` for discovered keywords, otherwise a labelled web search stand-in) and on the intent the keyword's wording shows. The brief's word-count target must also clear the page-type floor that the content audit applies (`../../seo-content-audit/references/core-eeat.md`, "Word-count floors by page type").

**SERP-feature signals.** The signals below mention AI Overviews, People Also Ask, featured snippets, video carousels, shopping packs and rich-result stars. RankScore has no SERP-feature data. Use those signals only when the user supplies them. Otherwise classify from titles, URL patterns, the top 3 pages' schema and the question variants.

## How to use

1. Take the top 10 and the question variants (step 5 of `SKILL.md`).
2. Classify each top-10 URL by page type (heuristics in `../../seo-sxo/references/page-type-patterns.md`). `get_keyword_serp` gives URLs and domains only: take titles from a web search for the keyword, or fetch the page when the URL pattern is unclear.
3. The dominant type (6 or more of 10) is the template. If the top 10 is split (for example 4-4-2), see the MIXED rule in `SKILL.md` Tips.
4. Check it against the keyword's intent (informational broad, informational how, commercial compare, and so on).
5. Record the template and a one-sentence justification in `BRIEF.md` ("Template type" and "Why this template").

---

## 1. ultimate-guide
**Pick when:** 6 or more of the top 10 have a `title` longer than 60 characters and the keyword is a broad noun phrase (for example "content marketing", "supply chain management").

- **SERP signals:** many "what is / how does / types of" questions; top 10 dominated by long-form editorial on /blog or /guide paths; AI Overview almost always present; titles often "The Ultimate Guide to X" or "X: A Complete Guide".
- **Intent:** informational (broad).
- **Outline shape:** H1 = "{Topic}: The Complete Guide". H2s: What is X, Why X matters, Core components of X (3-6 sub-H2s), How to get started with X, Common pitfalls, X vs adjacent concepts, FAQ.
- **Word count floor:** 2,500 words. Use 3,000-4,000 for high-volume head terms. (The content audit applies E-E-A-T checks at this length: anonymous bylines fail the YMYL veto whatever the length.)
- **Example brief patterns** (paraphrased from published winners):
  - "Marketing Attribution: The Complete Guide": 3,800 words, 9 H2s, 1 model-comparison table, 2 case-study callouts, FAQ of 8 questions.
  - "What Is Vendor Risk Management": 3,200 words, opens with a 180-word definition for AI citability, then framework, lifecycle, tooling, metrics, FAQ.

## 2. how-to
**Pick when:** the keyword starts with "how to" or "how do I", AND 5 or more of the top 10 carry numbered steps (`HowTo` schema or numbered H2s).

- **SERP signals:** questions like "how do I / how long does / what do I need"; titles start with "How to"; AI Overviews often show numbered steps; video results common.
- **Intent:** informational (procedural).
- **Outline shape:** H1 = "How to {verb} {object}". H2s: What you'll need, Step 1, Step 2, ..., Troubleshooting, FAQ.
- **Word count floor:** 1,200 words. Steps with screenshots can run shorter; pure-prose tutorials need more.
- **Example brief patterns:**
  - "How to migrate a WordPress site to a new host": 1,800 words, 8 numbered steps each with a screenshot and a "what could go wrong" callout, troubleshooting H2 with 5 known errors.
  - "How to set up GA4 ecommerce tracking": 1,400 words, 6 steps, a code block per step, a final "verify it worked" step.

## 3. listicle
**Pick when:** 6 or more of the top-10 titles start with a number ("10 X", "7 ways to Y") OR the keyword contains "tips", "ways", "examples", "reasons".

- **SERP signals:** titles "{Number} {plural noun}"; URLs with `/n-things/`, `/n-tips/`; questions mostly "what are some / what is the best".
- **Intent:** informational (list).
- **Outline shape:** H1 = "{N} {items}". H2s: one per list item (uniform length, about 150-250 words each), an intro before the list, an optional "How we picked" block, FAQ.
- **Word count floor:** 1,500 words. The floor scales with N: `N x 200` is a useful lower bound so each entry has substance.
- **Example brief patterns:**
  - "12 examples of brand storytelling": 2,400 words, 12 entries of about 180 words, brand logo per entry, a "what we learn" line per entry.
  - "8 ways to reduce SaaS churn": 1,700 words, 8 H2s each with a 1-paragraph rationale and 1 cited statistic, closing summary table.

## 4. explainer
**Pick when:** the keyword is "what is X", "X meaning" or "X explained", AND the top 10 is dominated by definition-led editorial pages (no products, no listicles).

- **SERP signals:** featured snippet often present (definition taken from a page); questions like "what does X mean / why is X important / what are the types of X"; AI Overview definition taken from one of the top 3.
- **Intent:** informational (concept).
- **Outline shape:** H1 = "What is {X}?". H2s: Definition (60-100 words, citable), Why X matters, How X works, Types or variants of X, X vs related concepts, Examples, FAQ.
- **Word count floor:** 1,200 words. The first 200 words must contain a tight, self-contained definition (passage citability for AI answers).
- **Example brief patterns:**
  - "What is zero-trust security": 1,600 words, 80-word lead definition, 5 H2s, 1 architecture diagram, FAQ of 6 questions.
  - "What is product-led growth": 1,400 words, definition, 3 hallmarks, 4 examples, FAQ; closes with a "PLG vs sales-led" comparison block.

## 5. comparison
**Pick when:** the keyword is "X vs Y", "X compared to Y" or "X or Y", AND 5 or more of the top 10 are head-to-head pages with both names in the H1.

- **SERP signals:** titles contain "vs", "vs.", "or", "compared"; URLs match `/x-vs-y/`; schema typically `Product` x2 + `BreadcrumbList`; commercial intent.
- **Intent:** commercial (compare).
- **Outline shape:** H1 = "X vs Y: {differentiator}". H2s: Short verdict, Feature-by-feature comparison (table-heavy), Pricing, Best for {persona A}, Best for {persona B}, How to choose, FAQ.
- **Word count floor:** 1,500 words of prose; tables count toward depth, not toward word count. The content audit applies 1,800 words to comparison pages: set the target at 1,800 or more so the article passes the audit.
- **Example brief patterns:**
  - "Notion vs Coda": 2,000 words, 12-row feature table, 3 use-case scenarios with verdicts, a "switch from one to the other" migration sidebar.
  - "Stripe vs Adyen for SaaS": 1,800 words, balanced verdict in the lead, pricing breakdown table, FAQ of 7 buyer-decision questions.

## 6. review
**Pick when:** the keyword is "X review", "is X worth it" or "X pros and cons", AND 5 or more of the top 10 are single-product editorial reviews (not listicles, not vendor pages).

- **SERP signals:** titles "{Product} Review {YYYY}"; questions like "is X good / does X work / X complaints"; rich-result stars often visible; strong freshness signals (date in the title or first paragraph).
- **Intent:** commercial (evaluate).
- **Outline shape:** H1 = "{Product} Review: {verdict phrase}". H2s: Short rating, Who it's for, Features tested, What we liked, What we didn't, Pricing, Alternatives, Final verdict.
- **Word count floor:** 1,500 words. Hands-on testing detail (screenshots, original data) counts for more than length.
- **Example brief patterns:**
  - "Ahrefs review (2026)": 2,200 words, dated lead, scorecard at the top, 6 feature deep-dives with screenshots, 4 alternatives at the bottom each linked to a comparison page.
  - "Fellow coffee grinder review": 1,600 words, original tasting notes from 8 brews, particle-distribution chart, "buy / skip" verdict in the first 100 words.

## 7. best-of
**Pick when:** the keyword is "best X", "top X" or "X alternatives", AND 5 or more of the top 10 are ranked lists of 5-15 products with `ItemList` schema or numbered product cards.

- **SERP signals:** titles "Best {N} X for Y"; URLs `/best-x/`, `/x-alternatives/`; commercial; shopping pack often above the organic results; questions like "what is the best / which X should I buy".
- **Intent:** commercial (rank).
- **Outline shape:** H1 = "The {N} Best {category} in {YYYY}". H2s: How we picked (methodology), #1 {Product}, #2 {Product}, ..., Honourable mentions, How to choose, FAQ.
- **Word count floor:** 1,800 words. Each ranked entry needs about 150-250 words of justification (use case, pros, cons, who it's for) to beat thin affiliate lists.
- **Example brief patterns:**
  - "Best CRM for small business 2026": 2,500 words, 8 entries of about 200 words, methodology block (12 scored criteria), 1 summary table, a "how to choose" decision tree.
  - "10 best Zapier alternatives": 2,200 words, 10 entries each with use-case fit, pricing snapshot and a link to a dedicated "vs Zapier" comparison page.

## 8. landing-page
**Pick when:** the keyword is the brand name, a high-commercial product term or a "{tool} for {persona}" head term, AND 5 or more of the top 10 are product or SaaS landing pages (not editorial, not blog). `domain_type` from `get_keyword_serp` helps here.

- **SERP signals:** titles "{Product} - {benefit}"; URL is the root or `/products/x`; schema `Product`, `SoftwareApplication` or `Organization`; transactional intent.
- **Intent:** transactional.
- **Outline shape:** H1 = brand or category benefit promise. Then: Hero CTA, Social proof, Problem framing, Feature blocks, Use cases, Pricing, FAQ, Footer CTA. (The brief is structural, not editorial: less prose on purpose.)
- **Word count floor:** 600 words. Landing pages put conversion before depth; the floor only satisfies crawlable-text minimums and thin-content thresholds.
- **Example brief patterns:**
  - "Project management for engineering teams": 800 words across hero, 3 feature blocks, 2 customer logos, pricing table, FAQ; H2s written for snippet capture.
  - "AI-native CRM": 700 words, hero with demo video, 4 feature blocks each with a screenshot, integrations grid, single pricing CTA.
