# Local SEO Report: {domain}

> Snapshot dated {YYYY-MM-DD} · RankScore position region: {snapshot.regionLabel} · Cities: {city list} · Primary keyword: "{keyword}"

RankScore data covers {project domain} only.
{Only when the target is another domain: "{domain} is not the RankScore project. The listing comparison, keyword positions, site-health audit, backlink check and AI answers were not measured."}

## Verdict: {STRONG | NEEDS WORK | WEAK}

{One sentence anchored in the dimension scores below. When the rank dimension is n/a: "Local keyword rank was not measured; the verdict uses 4 dimensions."}

## Dimension scores (0-10)

| Dimension | Score | Top finding | Source |
|---|---|---|---|
| GBP integration on page | {n}/10 | {one line} | {Firecrawl / WebFetch} |
| NAP consistency (against the RankScore listing) | {n}/10 | {one line} | {RankScore listing + pages} |
| Local on-page (title, H1, contact, service and location pages) | {n}/10 | {one line} | {RankScore site health / pages} |
| Organic rank for local keywords (own domain, report region only) | {n}/10 or n/a | {one line} | {RankScore / GSC} |
| Reviews and citations | {n}/10 | {one line} | {review pages / web search / RankScore backlinks} |
| **Composite** | {n}/10 over {5 or 4} dimensions | | |

## Top fixes

### Critical
1. {A fix anchored in a finding, with its source. Example: "Phone mismatch: the footer shows (212) 555-1234; the RankScore listing and the JSON-LD show (212) 555-9999. Pick one number. Change the listing in the RankScore dashboard, or fix the footer." [pages + RankScore listing]}

### High
- {fix}

### Medium
- {fix}

### Low
- {fix}

## Snapshot
- Business type: {Brick-and-mortar | SAB | Hybrid}
- Industry vertical: {vertical} (from {listing categories | pages})
- Listing (RankScore): status {status}, Localr sync {state}, description {present | thin | missing}, hours {present | missing}
- Pages sampled for NAP: {n}
- Local keywords: {n} tracked, {n} ranked but not tracked, {n} not measured; top 10 on {p} of {m} measured
- Review platforms audited: {Google, Yelp, ... | not provided}
- GSC local queries, last 28 days: {n} queries / {clicks} clicks / {impressions} impressions {or "Google enrichment: not configured (run bash <plugin root>/extensions/google/install.sh)"}
- Firecrawl: {used, ~{n} credits | skipped: Firecrawl not installed}

## Listing vs website (NAP and hours)

| Field | RankScore listing | Pages | JSON-LD | Status |
|---|---|---|---|---|
| Name | | | | |
| Address | | | | |
| Phone | | | | |
| Hours | | | | |
| Website | | | | |

Full list: `nap-inconsistencies.csv`. Listing changes are made in the RankScore dashboard.
{Multi-location only: "RankScore holds one listing ({listing city}). The other location pages were checked for internal consistency only (visible NAP against their own JSON-LD and map)."}
{Another domain or no listing: "No listing was compared. The value most pages show is used as the reference."}

## City keyword positions

Positions are organic positions for {snapshot.regionLabel}, checked by RankScore. They are not local-pack positions and not what a searcher inside each city sees.

| City | Keyword | Position | Change (history) | Ranking URL | Target URL | Volume | Last checked | Source |
|---|---|---|---|---|---|---|---|---|
| {city} | "{keyword}" | {n} | {+/-n since {date}} | {url} | {url} | {n} | {date} | RankScore tracked |

GSC city queries (Google data, last 28 days): {top rows: query, impressions, clicks, average position | not configured}.

Discovery results for local terms (RankScore discovery data, organic top 10, location not stated; not the local pack): {keyword: project domain at #{n} or absent; directories in the top 10}.

Full data: `local-keywords.csv`.

## Reviews health (if audited)
- Google: {n} reviews, {rating} average, newest review {n} days ago, owner responses {p}% of the 10 newest.
- Yelp: ...
- Trustpilot: ...

## Citation sample

| Directory | Web search (site: query) | Listing URL | Referring domain in RankScore backlinks |
|---|---|---|---|
| Google Business Profile | {detected / not detected} | {url} | {yes / no} |
| Yelp | | | |
| Facebook | | | |
| BBB | | | |
| Apple Business Connect | | | |
| Bing Places | | | |
| {vertical 1} | | | |
| {vertical 2} | | | |

Listing sync (RankScore `get_listing`): Localr {state as reported}.

*Caveat: this is a sample, not a comprehensive citation audit. For definitive coverage, use Whitespark / BrightLocal / Yext.*

## Schema status
- `LocalBusiness` JSON-LD: {present and valid | present, missing recommended properties | invalid | absent | unknown: Firecrawl not installed}
- Next step: run the `seo-schema` skill on {homepage URL} for paste-ready `LocalBusiness` markup with the correct industry subtype.

## AI answers for local prompts (if tracked)
- "{prompt}": {model}: mentioned {yes/no}, recommended {yes/no}, competitors named {list}, sources named {directories}.
- {Or: "No local prompts are tracked in RankScore AI visibility."}

## City plan (step 15 only)
- Cities with a page: {list}. Cities without a page or plan item: {list}.
- GBP post drafts: `gbp-posts.md` ({n} posts, {dating choice}, times in {UTC | zone}).
- Details: `city-plan.md`.

## Limitations

This skill could not assess:
- **Local-pack presence, position and competitors, and geo-grid rank.** RankScore has no local-pack or map data. Use a geo-grid tool (Local Falcon, GMB Crush, BrightLocal Local Search Grid) or check by hand from the location.
- **Per-city geo-targeted positions.** RankScore checks positions for one region ({snapshot.regionLabel}).
- **Comprehensive citation audit.** About 8 directories were sampled; a full audit covers 50 or more. Use Whitespark, BrightLocal or Yext.
- **GBP Insights.** Needs the listing owner's access. Ask the owner to export Insights.
- {Skipped parts, each with its reason: missing setting, Firecrawl not installed, Google not configured, quota used up, no review URLs, site-health run declined.}

## Next steps in RankScore

Proposals only. Each runs only after your yes in chat for that call.

| # | Call with exact arguments | What changes | Cost | Undo |
|---|---|---|---|---|
| 1 | `add_tracked_keyword(keyword: "{service} {city}", target_url: "https://{domain}/{path}/")` | Tracks the keyword for that page | No credit cost in the catalog | Remove in the dashboard |
| 2 | ... | | | |

## Methodology
- Date: {YYYY-MM-DD}
- RankScore tools and exact arguments: {for example `get_listing()`, `get_ranked_keywords_report()`, `get_keyword_serp(run_id: "...", keyword_id: "...")`, `run_site_health()` → cached: {true | false}}
- Pages fetched (WebFetch or Firecrawl): {URLs}
- Web searches: {queries}
- Google commands: {commands | not configured}
- No credentials are written in this report.
