# Template for the deliverable (seo-ai-search-share-of-voice)

Copy the block below into the run folder's `REPORT.md` and fill it. Remove sections that do not apply and name them under "Skipped".

```markdown
# AI Search Share of Voice: {brand} vs competitors

> {YYYY-MM-DD} · RankScore data covers {domain} only.
> Scope: {n} tracked prompts x {m} models ({model list}), cycle {cycle_date}{, partial cycle ({complete}/{expected} judgements)}. This is not a category-wide leaderboard.

## Summary

- Brand: {brand}, share of voice {x}% across all models ({mentions} mentions in {judgements} judgements)
- Leader: {leader name} ({x}%)
- Brand rank: {n} of {total} names seen in the answers
- RankScore visibility score: {score} ({+/- vs previous cycle {date}})
- Top gap: {cluster}: {competitor} named in {x}% of judgements, {brand} in {y}%
- Top action: {one line}

## Heatmap: share of voice per model (RankScore data)

| Name | {model 1} | {model 2} | {model 3} | All models |
|---|---|---|---|---|
| {brand} | {%} (n={k}) | {%} | {%} | {%} |
| {competitor 1} | {%} | {%} | {%} | {%} |
| {competitor 2} | ... | ... | ... | ... |

Leader per model: {model 1}: {name}; {model 2}: {name}. Weakest: {name}.
Competitor cells count mentions (`competitors_mentioned`). Citation (`domain_cited`) is judged for {domain} only.
Name merges: {variant -> name}. Other names (fewer mentions): {list}.

### {brand} per model

| Model | Mention rate | Recommended | Domain cited | Avg position | Sentiment (+ / 0 / -) |
|---|---|---|---|---|---|
| {model} | {%} (n={k}) | {%} | {%} | {x.x} | {a / b / c} |

### Google AI Overview and AI Mode (Google Search Console, {domain} only)

| Surface | Queries | Impressions | Clicks | Top queries |
|---|---|---|---|---|
| AI Overview | {n} | {n} | {n} | {q1}, {q2}, {q3} |
| AI Mode | {n} | {n} | {n} | ... |

{or: Google enrichment: not configured (run bash <plugin root>/extensions/google/install.sh)}

### AI assistant referrals (GA4, last {days} days)

| Source | Sessions |
|---|---|
| {chatgpt.com} | {n} |

Referrals measure click-through from AI chats, not citation.

## Who owns what

### {brand}
Strong in: {cluster}, {cluster}
Absent from: {cluster}, {cluster}

### {competitor 1}
Strong in: ...
Absent from: ...

## Topic cluster ownership

| Cluster | Prompts | Leader | Leader rate | {brand} rate | Status | Coverage |
|---|---|---|---|---|---|---|
| Pricing | {n} | {name} | {%} | {%} | contested | content exists, not named |
| Alternatives | {n} | {name} | {%} | {%} | missing | no content |
| How-to | {n} | {brand} | {%} | {%} | owned | published |
| Use cases | {n} | {brand} | {%} | {%} | owned (weak) | planned, not published |
| Integrations | {n} | none | 0% | 0% | empty | no content |
| Reviews | {n<3} | {name} | {%} | {%} | thin (not ranked) | ... |

Status is the first rule that matches: thin (fewer than 3 prompts), empty (no name in any answer), missing ({brand} under 10%, a competitor named), owned (no competitor named as often as {brand}; "weak" under 50%), contested (all others).

## Sources named in AI answers (answer text, sample of {n} answers)

| Source | Answers naming it | Clusters |
|---|---|---|
| {domain or URL} | {n} | {cluster} |

This list comes from reading answer text, not from a citation report.

## Top actions to close gaps

1. {action} (cluster {x}; coverage {label}; evidence: {k} prompts, {j} judgements)
2. ...

## Changes since {previous run date}

- Prompts gained: {query} ({model})
- Prompts lost: {query} ({model})
- Competitors new: {names}; gone: {names}
- Score: {old} -> {new}

## Next steps in RankScore (proposals; each runs only after your yes)

1. `set_ai_visibility_config(brand_name: "{brand}", domain: "{domain}", aliases: [...], enabled: {current value from evidence/ai-visibility.json | true for a new setup}, queries: [{every current query} + "{new prompt 1}", "{new prompt 2}"], kickoff: false)`
   - Changes: adds {n} prompts for {clusters}; replaces the whole setup. Current setup saved in `evidence/ai-visibility.json`. {No setup yet: brand and domain as you gave them.}
   - Cost: free without kickoff; `kickoff: true` starts a measurement run (quota).
   - Undo: send the saved setup again.
   - {Only when `enabled` is now `false`:} Separate item: switch tracking on (`enabled: true`) in the same call? This needs its own yes. Without it, `enabled` stays `false`.
2. `generate_content_plan(mode: "extend", focus_topics: [...], avoid_topics: [...], cluster_count: {n}, notes: "...")`
   - Cost: limited per period. Undo: no tool; adds clusters only.
3. `generate_article(topic: "...", target_keyword: "...", word_count: {n}, angle_notes: "...")`
   - Cost: article credits. Undo: no delete tool; remove it in the dashboard.

## Skipped

- {part}: {reason (setting missing, Google not configured, quota used up, cycle incomplete)}

## Methodology

- `get_ai_visibility(include_raw_output: false)`: {date}
- `get_ai_visibility_response(judgement_id: ...)` x {n}: {date}
- `get_content_plan()`, `list_articles(limit: 500)`, `get_ai_visibility_suggestions()`: {date}
- `get_keyword_discovery_run(run_id: ...)`, `get_keyword_serp(run_id: ..., keyword_id: ...)`: {date}
- `gsc_query.py --dimensions query --ai-overview` / `--ai-mode`, `ga4_report.py --report referrals`: {date or "not run"}
- Share of voice = a name's mentions / mentions of all names in the same judgements.
```
