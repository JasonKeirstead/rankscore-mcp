# {Client brand}: internal notes (agency only, do not send)

> {YYYY-MM-DD} · RankScore project {project_id, or "default project"} · Client document: PROPOSAL.md

## Methodology

| Tool or command | Arguments | Date |
|---|---|---|
| `get_ranked_keywords_report` | project_id: {id} | {YYYY-MM-DD} |
| `gsc_query.py` | --property {property} --days 28 --dimensions query --json | {YYYY-MM-DD} |

Skipped: {part}: {reason}.

## Next steps in RankScore

Proposals only. Each call runs only after a yes in chat for that call.

| # | Call with arguments | What changes | Cost | Undo |
|---|---|---|---|---|
| 1 | `add_tracked_keyword(keyword: "{kw}", target_url: "{url}")` | Tracks the keyword | No cost listed | Remove in the dashboard |
