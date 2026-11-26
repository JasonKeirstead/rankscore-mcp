# Rate limits, quotas and cost

What the `seo-api` skill needs to pace requests and forecast cost.

## Integrations API: 60 requests per minute per key

- The limit is **per API key**. Every worker, server and cron job that uses the same key shares the same 60 requests per minute.
- Reads cost nothing beyond the rate limit.
- Over the limit the API answers `429`. The documentation does not say whether a `Retry-After` header comes with it, so the code honours it when present and otherwise backs off.

### Request budget for a sync

| Run | Requests | Time at 60/min |
|---|---|---|
| Full backfill of N articles, `limit=500` | `ceil(N / 500)` list calls + N detail calls | about `(N + ceil(N/500)) / 60` minutes |
| Incremental run, k new articles | usually 1 list call + k detail calls | about `(k + 1) / 60` minutes |

Example: 1,200 articles = 3 + 1,200 = 1,203 requests, about 20 minutes. A larger `limit` only saves list calls; the detail calls dominate, because the list has no body.

### Pace first: client-side throttle

Stay under the limit instead of reacting to `429`. A sliding window of 60 calls per 60 seconds:

```python
import time
from collections import deque


class Throttle:
    def __init__(self, per_minute: int = 60) -> None:
        self.per_minute = per_minute
        self.calls: deque = deque()

    def acquire(self) -> None:
        while True:
            now = time.monotonic()
            while self.calls and self.calls[0] <= now - 60:
                self.calls.popleft()
            if len(self.calls) < self.per_minute:
                self.calls.append(now)
                return
            time.sleep(60 - (now - self.calls[0]) + 0.05)
```

When several processes share one key, give each a share (for example `per_minute=20` for three workers), or run one worker. A `sleep 1` between calls is the shell equivalent.

### Then back off: 429 and 5xx

Exponential backoff with jitter, `Retry-After` first, capped at 60 seconds, at most 6 attempts:

```python
import random
import time

import requests


def get_with_backoff(session: requests.Session, url: str, params=None, max_attempts: int = 6):
    delay = 1.0
    for _ in range(max_attempts):
        r = session.get(url, params=params, timeout=30)
        if r.status_code != 429 and r.status_code < 500:
            return r                      # 200, 401, 404 are handled by the caller
        retry_after = r.headers.get("Retry-After", "")
        wait = float(retry_after) if retry_after.isdigit() else delay
        time.sleep(min(wait, 60.0) * random.uniform(0.8, 1.2))
        delay = min(delay * 2, 60.0)
    raise RuntimeError(f"Gave up on {url} after {max_attempts} attempts")
```

```typescript
async function getWithBackoff(url: string, headers: HeadersInit, maxAttempts = 6): Promise<Response> {
  let delay = 1000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const r = await fetch(url, { headers });
    if (r.status !== 429 && r.status < 500) return r; // 200, 401, 404 are handled by the caller
    const retryAfter = Number(r.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay;
    await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 60_000) * (0.8 + Math.random() * 0.4)));
    delay = Math.min(delay * 2, 60_000);
  }
  throw new Error(`Gave up on ${url} after ${maxAttempts} attempts`);
}
```

Why jitter: without it, clients that hit the limit together retry together and hit it again. A random factor of 0.8 to 1.2 spreads them out.

With `curl`, `--retry 5` retries `429` and `5xx` with a growing delay and honours `Retry-After`. It does not retry `401` or `404`.

### Terminal and skip codes

- `401`: stop the run. Retrying a revoked key only uses up the rate limit.
- `404` on `/articles/:id`: skip the article; the next run tries it again.

The full client with throttle, backoff and these rules is in `templates/python.py` and `templates/typescript.ts`.

## MCP project tools: quotas, not rates

The catalog documents no per-minute limit for the project tools. Reads cost nothing. The write and job tools use credits or quota:

| Tool | Cost | Where to read the allowance |
|---|---|---|
| `generate_article` | Article credits | No balance tool: say it uses credits and ask |
| `add_calendar_entry` | Article credits, on the scheduled date | Same |
| `generate_content_plan` | Limited per period | Not exposed; a refusal comes back as `429` with limit and reset time |
| `start_keyword_discovery_run` | About 5 runs per 24 hours | `get_keyword_discovery_runs` (count the runs of the last 24 hours) |
| `check_tracked_keyword_positions` | Quota | Not exposed |
| `refresh_ranked_keywords_report` | Monthly allowance | `get_ranked_keywords_report` → `refresh {remaining, limit, resetAt}` |
| `refresh_backlink_report` | Small allowance | `get_backlink_report` → `refresh {used, remaining, limit, resetAt}` |
| `set_ai_visibility_config` with `kickoff: true` | Measurement-run quota | Not exposed |
| `run_site_health` | Job; a recent cached result (`cached: true`) costs nothing | Not exposed |
| `generate_listing_description` | Listed with the jobs; cost not stated | Ask before calling |

The edit tools (`add_tracked_keyword`, `set_content_plan_item_status`, `dismiss_next_action`, `toggle_keyword_bookmark`, the keyword-group tools) have no credits or quota listed in the catalog. They still need an explicit yes per call.

Rules for jobs:

- Show the allowance before asking, in the preflight shape: `RankScore: {tool} uses {credits | 1 of {remaining}/{limit} refreshes, resets {resetAt}}. Run it? (y/N)`
- A job refused with `HTTP 429 ... (limit n, resets t)` is never retried. Report the limit and reset time and continue without it.
- After a failed login the server pauses 30 seconds. Do not loop.
- A scheduled or headless run has no one to say yes. Keep it to reads, and put any writes and jobs in its output as proposals. This includes `run_site_health`: the run reuses the last saved result (`evidence/site-health.json`).

## Cost forecast template (`evidence/02-cost-forecast.md`)

```markdown
| Step | Surface | Call | Count | Cost |
|------|---------|------|-------|------|
| 1 | Integrations API | GET /articles?limit=500 | 3 | rate limit only |
| 2 | Integrations API | GET /articles/:id | 1,200 | rate limit only |
| 3 | MCP | get_ranked_keywords_report | 1 | free |
| 4 | MCP (proposal) | refresh_ranked_keywords_report() | 1 | 1 of 2/4 refreshes, resets 2026-12-01 |
| 5 | MCP (proposal) | generate_article(...) | 3 | article credits (balance not readable) |

Requests on the API key: 1,203, about 20 minutes at 60/min.
Quota used if all proposals are approved: {list}.
```
