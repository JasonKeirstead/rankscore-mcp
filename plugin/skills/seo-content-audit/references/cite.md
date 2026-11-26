# CITE rubric (30 items)

> Adapted from SE Ranking seo-skills (MIT). See `../../../THIRD_PARTY_NOTICES.md`.

CITE = Clear answer, Include primary stats, Timestamp freshness, Entity authority. Tuned for AI-search citation readiness: passages from pages with high CITE scores are the ones LLMs cite.

## Veto items (any one triggers NO PUBLISH)

1. **No clear answer in the first 300 words.** LLMs scan the early paragraphs; if the answer is not there, the page is not cited.
2. **No datestamp on time-sensitive content.** "Best X 2024" read in 2026 with no last-updated date gets passed over.
3. **No entity disambiguation for proper-noun queries.** A page about "Apple" that does not say whether it means Apple Inc. (computers) or Apple Corps (the Beatles' company) loses to clearer pages.

Before publishing, veto 2 follows the pending-CMS rule (see "How to score" below).

---

## 1. Clear answer (8 items)

The answer is easy to find, fast and direct.

1. The primary question or topic of the piece is answered in the first 200 words.
2. The first paragraph is at most 60 words and stands alone as a summary.
3. The answer is stated in declarative sentences, not buried in prose ("X is ...", not "many people wonder whether X might be...").
4. Headings preview the answer ("How long does X take?" answered by "X takes 4-6 weeks", not "Let's explore the timeline").
5. Lists, tables or step blocks present the answer in scannable form where applicable.
6. Numbers, dates and named entities appear in the answer (specifics LLMs can extract).
7. The answer comes first and supporting context follows, not the other way round.
8. No clickbait deferral ("read on to find out..."). The answer is given, then explained.

## 2. Include primary stats (8 items)

The piece references concrete data, with attribution.

1. At least one statistic, percentage or number cited in the first half.
2. Sources are linked inline next to the stat (not a pile of footnotes at the end).
3. Sources are primary (the original study, government data, the company's own report), not aggregator sites.
4. The date of the data is stated near the stat ("per the 2025 X report").
5. Several stats support the same claim where possible (one source, then a corroborating source).
6. The methodology of cited data is briefly given (sample size, population, time window).
7. Original data the author generated (survey, analysis, A/B test) is presented with its methodology.
8. Where data is contested, the piece says so and does not cherry-pick.

## 3. Timestamp freshness (7 items)

The reader (and the LLM) can tell when the piece is from.

1. Original publish date visible on the page.
2. Last-updated date visible (and different from the publish date if updated).
3. The year appears in the title, URL or H1 if the topic is time-sensitive.
4. Schema.org `datePublished` and `dateModified` populated correctly (ISO 8601).
5. Time-sensitive claims ("current pricing", "best as of") carry explicit dates.
6. An updates log is visible if the piece was substantively revised.
7. Old data points (more than 2 years) are flagged or replaced.

## 4. Entity authority (7 items)

Proper nouns, brands, people and places are disambiguated and authoritative.

1. The primary entity (brand, product, person, place) is named with its full identifier at first mention (for example "Apple Inc.", not "Apple").
2. Wikipedia or Wikidata disambiguation is referenced, or clear from context.
3. Schema.org markup includes the entity (`Organization`, `Person`, `Product`, `Place`) with `sameAs` links to authoritative profiles.
4. The author byline links to a profile that establishes the author's expertise on this entity.
5. The brand name is consistent across the piece (no informal abbreviations that confuse LLMs).
6. Related entities get their own short disambiguation (especially for B2B or niche topics).
7. Citations include canonical entity references (for example a DOI for papers, official URLs for products).

---

## How to score

Mark each item ✓ (1), ~ (0.5) or ✗ (0). Dimension score = sum / item count x 100%. CITE composite = average of the 4 dimension scores.

**Pre-publish audits** (a RankScore article before publishing, or pasted text): Timestamp 1, 2 and 4 and Entity authority 3 and 4 are site-template items. Score them with the list and the rules in `core-eeat.md` ("Pre-publish audits: site-template items"). Veto 2 (no datestamp) follows the pending-CMS rule there: it does not trigger before publishing when only the CMS date is missing.

## Threshold

- CITE composite at least 70% AND no veto = pass for citation readiness.
- 55-69% = "publish with fixes": improve the lowest-scoring dimension first.
- Below 55% OR any veto = AI search will probably not cite the piece; substantial rework needed.

## Why this matters

LLM citation consistently rewards passage-level extractability. Pages that score well on Clear answer and Include primary stats are the ones pulled into AI Overviews, Perplexity, ChatGPT and Gemini answers. CITE is a working approximation of what those models prefer, not a guarantee. For prompts the project tracks, RankScore's AI visibility judgements and answer texts (`get_ai_visibility`, `get_ai_visibility_response`) show directly which sources the models named; use them to check the rubric against real answers.

## Calibration tips

- For news content, Timestamp items 1, 2, 3 and 5 should all be ✓: undated news is dead.
- For evergreen topics, Timestamp items 5-7 confirm the freshness window; do not chase dates for their own sake.
- For brand-monitoring content (where citation matters most), Entity authority should be at least 80%.
- For commercial content, Include primary stats lifts a piece from marketing copy to decision-grade: invest here.
