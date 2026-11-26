# Persona rubrics for SXO scoring

Score the candidate page from each of these 4 personas, 0-10 per persona. The weighted sum (with the intent weighting profile below) is the SXO score (0-100).

Score from what the live page shows (WebFetch, and Firecrawl when installed). When a signal cannot be checked (for example schema without Firecrawl), score from the other signals and say which one was skipped.

## 1. The Skimmer
A reader who lands on the page and expects to get the answer in under 30 seconds. They scan H2s, look for tables and lists, and may not read prose at all.

**Score 10 if:**
- A TL;DR, answer or verdict is in the first 200 words or in a clearly visible callout box.
- H2s are descriptive, not "Introduction" or "Background": they preview the content.
- Lists, tables or step blocks dominate the layout.
- Bold or highlighted phrases mark the key points.

**Score 0 if:**
- The "answer" is below 1500 words of preamble.
- H2s give no information ("What you need to know", "Let's begin").
- Continuous prose with no visual hierarchy.

## 2. The Researcher
A reader deep in research mode who compares the page with 5 or more other tabs. Looks for data, sources and dates.

**Score 10 if:**
- Original data, statistics or proprietary research.
- Sources cited inline (links or numbered references).
- A last-updated date that is visible and recent (less than 6 months for fast-moving topics).
- Counter-arguments or trade-offs acknowledged.
- The author has visible credentials relevant to the topic.

**Score 0 if:**
- Generic claims with no sources.
- No publish or update date.
- Reads like AI-spun content (vague, no specifics).

## 3. The Buyer
A reader who intends to convert. Wants to know if the product, service or recommendation solves their problem and is worth the cost.

**Score 10 if:**
- A clear value proposition above the fold.
- Pricing visible (or "contact us" with a clear reason).
- Social proof: testimonials, case studies, named customers.
- Specific outcomes, not only features ("cut acquisition cost 32%" against "save money").
- A pricing or plan comparison when there are several options.

**Score 0 if:**
- "Contact for pricing" with no context.
- Generic benefits ("save time", "boost revenue") with no specifics.
- No social proof, or vague claims ("trusted by leading brands").

## 4. The Validator
A reader who must verify the page's claims for someone else (a manager, a team, a stakeholder). Looks for trust signals before sharing.

**Score 10 if:**
- An author bio with title, company and link.
- A linked editorial standards or methodology page.
- A last-reviewed or updated date on every page.
- Correct Schema.org markup (`Article`, `Product`, `FAQ`). Needs Firecrawl to check.
- HTTPS, privacy policy, terms of service.
- An About page that shows the real people and a real address behind the publisher.

**Score 0 if:**
- No author, or an "Admin" or generic byline.
- No publish or update dates.
- Poor technical hygiene (broken links, missing privacy policy).

## Weighting profile by intent

The keyword shows which intent dominates. Weight the personas as follows:

| Intent | Skimmer | Researcher | Buyer | Validator |
|---|---|---|---|---|
| Informational ("what is", "how to") | 40% | 30% | 10% | 20% |
| Commercial-investigation ("best X", "X vs Y", "X review") | 25% | 25% | 35% | 15% |
| Transactional ("buy X", "X pricing", "sign up") | 20% | 15% | 50% | 15% |
| Navigational ("brand name", "brand login") | 30% | 10% | 40% | 20% |

## Combined SXO score

The SXO score is the **weighted sum** of the persona scores (0-100).

- 75 or more: the page is well aligned with the results it targets.
- 50-74: room to improve; see the persona gaps in the recommendation.
- Less than 50: a page-type or intent mismatch is likely; `seo-sxo` recommends a different page type.

The score is a heuristic. Before you recommend a rewrite, always cross-check it with the top-10 page types and, when available, the SERP features. Those show what Google rewards.
