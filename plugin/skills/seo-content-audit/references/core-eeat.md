# E-E-A-T scoring rubric (60 items)

> Adapted from SE Ranking seo-skills (MIT). See `../../../THIRD_PARTY_NOTICES.md`.

> **September 2025 Quality Rater Guidelines.** Updated for the September 2025 Quality Rater Guidelines and the December 2025 core update: E-E-A-T applies broadly, not only to YMYL topics. The dimension definitions, the 4 vetoes and the AI-content markers below are defaults for all topics; YMYL-specific calibrations are called out where they differ.

15 items per dimension x 4 dimensions = 60 items. Score each ✓ (1), ~ (0.5) or ✗ (0). Dimension score = sum / 15 x 100%. E-E-A-T composite = average of the 4 dimension scores.

Where RankScore can supply evidence for an item on the project's own domain, the item says which tool. For other domains those inputs are not available; do not guess.

## Veto items (any one triggers NO PUBLISH)

1. **Anonymous authorship on a YMYL topic** (Your Money or Your Life: medical, financial, legal, safety). These topics need an author byline.
2. **Factual claims with no sources cited.** The piece asserts statistics, study findings or expert positions without inline citations.
3. **Undisclosed affiliate or sponsored relationships.** Required by the FTC and Google's helpful-content guidelines.
4. **AI-generated YMYL content with no human-review markers.** Trips when 4 or more of the 8 AI-content markers below are present *and* the topic is YMYL *and* the page has none of: a named human editor byline, a "reviewed by" credit, a "last reviewed" or "fact-checked on" date. AI assistance is fine; AI assistance on health, finance, legal or safety topics with no human accountability is not.

Before publishing (RankScore article or pasted text), vetoes 1 and 4 follow the pending-CMS rule in "Pre-publish audits: site-template items" below.

---

## 1. Experience (15 items)

First-hand engagement with the topic. Did the author actually do this?

1. The author has personally used, tested or experienced the product, service or process discussed.
2. The piece includes original photos, screenshots or video the author captured.
3. Original data the author collected (survey, A/B test, log analysis) is presented.
4. Specific, verifiable details only an experienced practitioner would know (numbers, edge cases, quirks).
5. Process documentation (step-by-step accounts) reflects real execution, not hypothetical steps. (See "Word-count floors by page type": automatic ✗ if materially below the floor without an explicit auditor justification.)
6. Comparative observations across multiple instances (for example "across 12 client engagements, 8 saw...").
7. The piece acknowledges trade-offs and failure modes the author encountered.
8. Specific dates, locations or contexts ground the experience claims.
9. Hands-on demonstrations (live code, working artifacts, before/after evidence).
10. Customer, user or patient quotes attributed to a real source (with permission).
11. Time-based observations (for example "after 6 months of using X, the result was...").
12. Process improvements or tweaks the author made along the way.
13. Tools, specific configurations or version numbers mentioned (signals real use).
14. Pricing or cost specifics from real engagements (not a price list).
15. Failures or rejected approaches described, not only successes.

## 2. Expertise (15 items)

The author's qualifications and depth on the topic.

1. Author byline visible with a full name, not "Admin" or a pseudonym.
2. Author bio includes credentials relevant to the topic (degree, certification, professional title).
3. Author bio includes years of experience in the topic domain.
4. Author has a linkable profile (LinkedIn, professional homepage, ORCID for academics).
5. Author publishes consistently in this topic area (links to other articles).
6. Citations to authoritative primary sources (peer-reviewed papers, government data, original research).
7. Industry-specific terminology used correctly and consistently.
8. Counter-arguments addressed and engaged, not strawmanned.
9. Methodology section if the piece presents data or analysis. (See "Word-count floors by page type": automatic ✗ if materially below the floor without an explicit auditor justification.)
10. Disclosure of the limits of the analysis or recommendations.
11. Up to date with current developments in the field (recent references, current practice).
12. Distinguishes correlation from causation when discussing data.
13. Avoids absolute claims where the field is genuinely contested.
14. Editorial review credit (for example "reviewed by Dr. X").
15. Author responds to comments or corrections (signals ongoing engagement).

## 3. Authoritativeness (15 items)

Reputation of the author and publisher in the topic domain.

1. The publisher has an "About" page describing its mission, history and team.
2. An editorial guidelines or standards page is public.
3. The publisher is referenced or cited by other authoritative sources in the same field.
4. Wikipedia or industry-association mentions of the publisher (a strong signal).
5. The author has spoken at industry events, been quoted in trade press, or published in authoritative venues.
6. Awards or recognitions from peer institutions (with verifiable links).
7. The publisher's contact information is real and discoverable (physical address, named team).
8. Domain age and consistency (publishing on this topic for years, not weeks).
9. Other articles by this author cluster around the same topic (topical authority).
10. Internal links from cornerstone content on this site point to this piece (it is part of a hub). RankScore: `get_content_plan` shows whether the page is a supporting article of a cluster (match by `target_keyword` or `title`) and whether the pillar is marked `published`. The plan has no URLs and `status` is a flag the user sets: find the pillar's live URL as in SKILL.md step 5, then fetch it to confirm the link. No pillar URL found: ~ with the note `pillar URL unknown: not checked`.
11. External backlinks to this piece from authoritative sites. RankScore (project domain only): `get_backlink_report(max_rows: 1000)`, `backlinks[]` where `url_to` is this URL, with `rank` and `dofollow`; profile detail in `../../seo-backlinks-profile/SKILL.md`. Another domain: not measurable with RankScore; score ✓ or ✗ only on visible evidence (for example coverage found by web search), otherwise ~ with the note `not measured`.
12. The publisher is a recognised authority for its topic by industry consensus (not only self-description).
13. Press release or news coverage of the publisher's research or position on this topic.
14. Citations from peer publications to the publisher's earlier work.
15. Inclusion in expert lists, "best of" roundups or award lists by external bodies.

## 4. Trustworthiness (15 items)

Signals that the page and publisher are honest, accurate and accountable.

1. HTTPS, valid certificate, no mixed-content issues.
2. Privacy policy and terms of service reachable from the page footer.
3. The publisher's name, registered business address and contact route published.
4. Last-updated date visible and recent (within the freshness window for the topic).
5. Original publish date visible.
6. Editorial standards or fact-check policy linked.
7. Corrections or updates log (visible if substantive corrections were made).
8. Comment moderation visible (no spam, signs of engagement).
9. Affiliate, sponsored or paid-content disclosures clear and prominent (if applicable).
10. Author bio prevents impersonation (recognisable photo, social proof links).
11. Schema.org `Article` (or a sub-type) with `author` (Person), `publisher` (Organization) and a valid `datePublished`.
12. Site-wide trust signals: customer reviews and testimonials linked to real names or organisations.
13. The piece contains no known misinformation about the topic (cross-check with authoritative sources).
14. Cited sources are themselves trustworthy (not Wikipedia citing Wikipedia citing Wikipedia).
15. Pricing, claims and guarantees are stated clearly, not buried.

---

## Pre-publish audits: site-template items

A RankScore article read with `get_article` before it is published, or pasted text, has no site template yet. The CMS adds the items below, so the text alone cannot show them. This is the one list for both rubrics.

| Rubric | Items |
|---|---|
| Expertise | 1-4 (byline, bio credentials, bio years, linkable profile), 14 (editorial review credit) |
| Authoritativeness | 1, 2, 7 (About page, editorial guidelines, contact details) |
| Trustworthiness | 1-6 (HTTPS, footer policies, publisher details, last-updated date, publish date, editorial policy), 8 (comment moderation), 10 (author bio), 11 (`Article` schema), 12 (site-wide reviews) |
| CITE Timestamp (`cite.md`) | 1 (publish date), 2 (last-updated date), 4 (`datePublished` / `dateModified` schema) |
| CITE Entity authority (`cite.md`) | 3 (entity schema with `sameAs`), 4 (byline links to a profile) |
| AI-content markers | 6 (byline shape), 7 ("reviewed by" or "fact-checked" credit) |

Rules:

1. **Which live post.** A `get_ranked_keywords_report` row `url` on the project domain that is an article page (not the homepage or a category page), or a post the user names. Fetch it with `WebFetch`, and with Firecrawl `rawHtml` as in SKILL.md step 2.
2. **The text has it.** If the article text itself shows the item (for example a "reviewed by" line), score it from the text.
3. **The live post has it, or lacks it.** Otherwise score the item from the live post and mark it `from site template: {url}`. If the post lacks it, score ✗ with the note `site template lacks it: add in the CMS before publishing`.
4. **No live post found.** Mark the item `pending CMS`. Leave it out of the dimension score (score = sum / scored items x 100%; say how many items were scored) and list it in `VERDICT.md` under "Pending CMS". A pending AI-content marker counts as not fired.
5. **Vetoes.** E-E-A-T veto #1 (anonymous author on YMYL), veto #4 (no human-review markers) and CITE veto #2 (no datestamp on time-sensitive content) do not trigger before publishing when the missing element is one the CMS adds (byline, review credit, dates), whether the live post lacks it or no live post was found. Record each as `pending CMS: add before publishing`. Each one caps the verdict at PUBLISH WITH FIXES and goes into the top 5 fixes as a condition for publishing. After publishing, re-audit the live URL: the vetoes then count in full.

---

## AI-content markers (8 items, feed veto #4)

The September 2025 Search Quality Rater Guidelines made "low-effort AI-generated content" an explicit demotion signal. These markers do not ban AI use; they identify pieces where AI was clearly the *only* hand on the page. Score each marker **fired** or **not fired** during the audit (record the decision and the evidence in `03-eeat-scoring.md`), count how many fire, and combine the count with the YMYL and human-review check in veto #4.

1. **Generic LLM phrasing without specificity.** Repeated formulaic transitions and filler, for example "in today's world", "it's important to note that", "let's dive in", "navigating the landscape of", "in conclusion", "when it comes to", "at the end of the day". Detection: search the body for the phrase set; **3 or more matches = fired**.
2. **Repetitive structural template across the site.** Five or more recent pieces on the same domain share the same H2, H2, H2, H2, FAQ structure with similar word counts and identical section labels (for example every post has "What is X?", "Benefits of X", "How to use X", "FAQ"). Detection: for RankScore articles, read the 5 most recent other `list_articles` entries with `get_article(id, format: "markdown")` and compare H2 skeletons and word counts; for live siblings that are not RankScore articles, spot-check 5 with `WebFetch` or a Firecrawl site map (`../../seo-firecrawl/SKILL.md`). **Same skeleton on 4 or more of 5 = fired.**
3. **No original insight or first-hand evidence.** Every claim paraphrases something already in the top 10; no original photo, no proprietary data, no specific anecdote. A 0/15 or 1/15 Experience score corroborates it. Detection: pick 3 non-trivial claims and check whether each appears (often verbatim or nearly) in the top 10 for the target keyword (`get_keyword_serp` for a discovered keyword, otherwise a labelled web search). **3 of 3 paraphrased without attribution = fired.**
4. **Em-dash density plus bolded-phrase peppering.** Heavy mid-sentence em-dash use plus a bolded summary phrase every 2-3 paragraphs. Detection: count em-dashes per 1,000 words; **more than 15 per 1,000 words together with bolded phrases in 30% or more of paragraphs = fired**.
5. **Hallucinated or unverifiable citations.** Inline citations exist but the linked source does not contain the claim, the URL returns 404, or the cited study cannot be found on Google Scholar or the publisher's site. Detection: spot-check 3 random inline citations with `WebFetch`; **1 or more of 3 fails = fired**.
6. **AI-shaped author byline.** The byline reads "Editorial Team", "Staff Writer" or "{SiteName} Team" with no linked profile, OR links to a profile page with no other articles, no LinkedIn and no real-world footprint. Detection: open the byline; check for a real bio with a linked social or LinkedIn profile. **Generic team byline OR ghost profile = fired.**
7. **No "reviewed by" or "fact-checked on" credit.** Especially on YMYL topics, no human-accountability surface at all is itself a signal; with markers 1-6 it suggests AI-only authorship. Detection: search the page for "reviewed by", "fact-checked", "medically reviewed", "edited by", "last reviewed". **None found = fired.**
8. **Suspiciously round publishing cadence.** The site shipped 20+ pieces on different topics in a week with no clear editorial arc, or a new domain published 50+ articles in its first month. Detection: list the most recent 30 publish dates on the domain (a `site:domain.com` web search, the blog index, or `list_articles` `created_at` for the project's RankScore articles). **20 or more within 7 days across unrelated topics = fired.**

**Counting rule:** fired = 1, not fired = 0; record the evidence inline. **4 or more fired = AI content suspected.** Combine with veto #4's YMYL and missing-human-review check before triggering the veto.

**RankScore articles:** batch generation from one template can fire markers #2 and #8 by itself. Record them as fired, and say in the verdict that they reflect the generation method. Veto #4 still needs a YMYL topic and no human-review surface.

---

## Word-count floors by page type

Detect the page type from the URL pattern, H1 phrasing and JSON-LD `@type`, then apply the floor below.

| Page type | Floor | Rationale |
|---|---|---|
| Ultimate guide / pillar | 2,500 | Comprehensive coverage of a topic |
| How-to | 1,200 | Step-by-step depth |
| Listicle / best-of | 1,500 | Per-item description depth |
| Comparison (X vs Y) | 1,800 | Feature matrix + verdict + rationale |
| Explainer | 1,200 | Concept depth + examples |
| Review (single product) | 1,500 | Pros / cons / verdict + evidence |
| Landing page (commercial) | 600 | Conversion-led, less depth-driven |

These are floors, not targets. A 1,000-word how-to that is deeply original beats a 2,000-word how-to padded with a generic intro and conclusion. Use the floors as a thin-content tripwire: anything materially below the floor for its page type fails the depth items by default unless the auditor explicitly justifies the exception.

---

## Threshold

- E-E-A-T composite at least 75% AND no veto = pass.
- 60-74% = "publish with fixes" (top 5 fixes from the lowest-scoring items).
- Below 60% OR any veto = no publish.

## Calibration tips

- For YMYL topics, raise the bar: composite at least 85%, each dimension at least 75%.
- For purely informational content (for example a how-to on a hobby), Authoritativeness can be slightly lower if Experience and Expertise are strong.
- For brand or product content, the buyer-relevant Trust items dominate (transparent pricing, clear claims, social proof).
