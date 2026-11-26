# Social posts: format, writing and creation

Shared by the social-campaign skills. Adapted from SE Ranking seo-skills (MIT). See ../../../THIRD_PARTY_NOTICES.md.

## Platform norms

| Platform | Length | Notes |
|---|---|---|
| LinkedIn | about 3,000 characters | Professional, can be long-form, use line breaks |
| Instagram | about 2,200 characters | Visual first; hashtags at the end or in the first comment; needs media |
| Facebook | shorter performs better | Conversational |
| X/Twitter | 280 characters | Punchy |
| TikTok | about 2,200 characters | Casual, trend-aware |

Vary hooks and formats across the batch; do not repeat one structure. Keep each post traced to its source (keyword, question, prompt or page) so the user sees why it exists.

## Content pointers: writing for keywords and AI-visibility gaps

- **Target one intent per post.** Pick one keyword or question and answer that one thing clearly. Posts that try to cover everything rank and get cited for nothing.
- **Lead with the answer.** Put the takeaway in the first line, then support it. Readers who skim and AI engines both extract the clearest self-contained statement.
- **Write the way people ask.** Phrase hooks, captions and headers as real questions with plain-language answers. AI prompts are conversational, so natural phrasing beats keyword stuffing.
- **Make claims quotable on their own.** AI tools lift sentences out of context, so each key sentence must stand alone: one idea, declarative, no "as mentioned above".
- **Be specific.** Numbers, concrete examples, named steps, clear definitions. Specific content gets cited and sets the brand apart from generic content competitors already own.
- **Fill the gap, do not echo it.** If a competitor already owns a topic, find the sub-question or angle they miss instead of repeating what already ranks.
- **Stay consistent across surfaces.** Use the same terms and claims on social, the site and the brand's profiles so AI builds one coherent picture of what the brand is the answer for.
- **Keep it human.** It must still read like a good post. Optimising for keywords or AI must not make the writing robotic.

Match intent to format: informational questions become educational posts; commercial and comparison terms become proof, demos and comparisons.

## Scheduling: ask before creating

Do not guess dates and do not leave everything undated by default. Ask how to date the batch and offer:

- **Spread evenly** across a window (for example the next 7 days, one post per slot at a sensible hour).
- **Fixed cadence** (for example every weekday at 10:00, from a start date the user gives).
- **Manual** dates per post.
- **No dates yet** (undated drafts to place on the calendar later).

Convert each time to ISO 8601 and pass it as `scheduledAt`. Planable treats scheduled times as UTC: confirm the timezone or state that the times are UTC. Do not promote a site article before it exists (check `get_calendar.scheduled_for` and `list_articles`).

## Creating drafts in Planable

Planable is a separate MCP server, not part of RankScore. Its tools change the user's Planable workspace, so show the drafts and get the user's yes before creating them, unless the user already said "just create them".

- If the workspace is ambiguous, call `list_workspaces` and let the user pick. Do not guess.
- `list_pages(workspaceId)` gives the page IDs. Pages cannot be created through the connector: if a needed page is missing, ask the user to add it in Planable.
- Per-platform copy: `create_post(workspaceId, pageId, text, scheduledAt?, labels?, firstComment?)`, once per page.
- Same copy on several pages: `create_grouped_post(workspaceId, pageIds[], text, scheduledAt?, labels?)`. A grouped post shares one text across every page, so grouping platforms with different limits (for example Facebook and X) forces the copy under the strictest limit (280 characters). When length or tone should differ, use separate `create_post` calls.
- Labels: `list_labels` or `create_label`, then pass the label IDs. Labels belong to one workspace: create the label in each workspace you post to. A campaign label makes later reporting easy.
- Keep posts as proposed drafts: do not set `publishAtScheduledDate`. Set it to true only if the user asks for auto-publishing.
- Report `validationErrors`. Instagram and other visual platforms need media: offer to attach a public image URL through `mediaUrls`, or say that media must be added in Planable before publishing.
- Afterwards, report how many drafts were created, in which workspace and pages, the schedule (UTC) and the errors. Say that nothing publishes until it is approved in Planable.

## Without Planable: local drafts

Write one file per post in the run folder, `posts/NN-{platform}-{slug}.md`:

```
platform: LinkedIn
scheduled_at_utc: 2026-12-02T10:00:00Z   (or "undated")
source: {keyword, question, prompt or page} ({RankScore | WebSearch | Search Console})
landing_url: {site URL or "none"}

{post text}
```

Also write `posts.csv` with the columns `platform, scheduled_at_utc, text, source, landing_url` so the user can paste or import the batch.
