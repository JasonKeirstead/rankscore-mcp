# Auth and keys

How to authenticate against RankScore, and where each credential is allowed to go. Used by the `seo-api` skill for "how do I authenticate", "where is the key", "how do I run this in CI" and "why do the project tools not show up".

## Two credentials, two surfaces

| Credential | Enables | Where it may be used |
|---|---|---|
| **API key** | The documented Integrations API (`GET /articles`, `GET /articles/:id`), and the MCP tools `list_articles` / `get_article` | Your own code, CI jobs, servers, and the plugin settings |
| **Account email and password** | The MCP project tools (all `get_*` except the two article tools) and, with "Enable write tools", the write and job tools. They use the dashboard's undocumented `/api/projects` endpoints. | **Only** the plugin settings (or its credentials file). Never in user code, scripts, CI secrets or generated recipes. |

## Integrations API key

- **Where:** in RankScore, Integrations > API > Manage > Generate API key.
- **Docs:** https://help.rankscore.co/article/15-rankscore-api
- **Scope:** one key belongs to one project. `GET /articles` returns that project's completed articles; an article of another project gives 404. For another project, use that project's key.
- **Header:** `X-API-Key: <key>`. Base URL `https://dashboard.rankscore.co/api/integrations/v1`.
- **Liveness check** (cheapest call):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H "X-API-Key: ${RANKSCORE_API_KEY}" \
  'https://dashboard.rankscore.co/api/integrations/v1/articles?limit=1'
```

`200` = the key works. `401` = missing, wrong or revoked. Through MCP: `list_articles` with `limit: 1`.

### Storing the key

- The dashboard shows the key only once, when it is generated. Store it at once; if it is lost, generate a new one (see Rotating).
- Read it from an environment variable (`RANKSCORE_API_KEY` in every recipe). Never hardcode it, never commit it, not even to a private repository: use `.env` (gitignored) plus a secret manager.
- Send it only in the header. Never put it in a URL query string: URLs end up in access logs, proxies and browser history.
- Never ship it to a browser. Front-end code calls your backend, and the backend calls RankScore.
- CI: the platform's secret store (GitHub Actions secrets, GitLab CI variables and similar). Docker: `--env-file` at run time, never baked into an image layer.
- Never write the key into `RECIPE.md`, `code/` or `evidence/`. Recipes use the placeholder `${RANKSCORE_API_KEY}`.

### Rotating the key

Rotate when the key leaks (commit, chat message, screenshot), when someone with access leaves, or on a fixed schedule.

1. Create the new key in Integrations > API > Manage > Generate API key. It is shown once.
2. Put it in the secret store at once, and redeploy the jobs that use it.
3. Revoke the old key. Calls with it then get `401`.

The documentation does not say whether a project can hold two keys at once. If the dashboard allows only one, rotation gives a short window of `401` responses: do it between two sync runs.

## Account login (project tools)

- Set the account email and password in the plugin settings. The password is stored as a sensitive plugin value: in the macOS Keychain, or in `~/.claude/.credentials.json` on Windows and Linux. The MCP server signs in with it and keeps the session in memory only.
- The project tools use the dashboard's `/api/projects` endpoints. They are **not documented** and can change. Use them through this MCP server only. When a user asks for code that calls them, explain why not (password in scripts, no write safeguards, breaks without notice) and give an MCP tool-call sequence instead.
- MFA is not supported. An account with MFA on can get `RankScore login failed`; use an account without MFA that has no more access than needed.
- After a failed login the server pauses 30 seconds. Do not retry in a loop: tell the user to check the email and password.

## Plugin settings

| Setting | Server variable | Enables |
|---|---|---|
| RankScore API key | `RANKSCORE_API_KEY` | `list_articles`, `get_article` |
| RankScore account email + password | `RANKSCORE_EMAIL`, `RANKSCORE_PASSWORD` | Project reads (`get_content_plan`, `get_ranked_keywords_report`, `get_ai_visibility`, ...) |
| Default project id | `RANKSCORE_PROJECT_ID` | Project tools without a `project_id` argument |
| Enable write tools (default off) | `RANKSCORE_ENABLE_WRITES` | The edit and job tools. Skills still ask before each call. |
| Credentials file (optional) | `RANKSCORE_CREDENTIALS_FILE` | Instead of the fields: API key, email and password on lines 1, 2 and 3, file mode 600. The fields take priority. |

If a tool the recipe needs is missing from the tool list, name the setting that enables it and continue with what is there.

### Server added by hand

A server added with `claude mcp add rankscore ...` instead of the plugin reads the same variables. Prefer the credentials file over passing the password on the command line, which leaves it in the shell history. Tool names are then `mcp__rankscore__<tool>` instead of `mcp__plugin_rankscore_rankscore__<tool>`.

## Errors and what they mean

| Surface | Error | Meaning | Fix |
|---|---|---|---|
| Integrations API | `401` | Key missing, wrong or revoked | Check the `X-API-Key` header and the key in Integrations > API > Manage. Do not retry. |
| Integrations API | `404` on `/articles/:id` | Still generating, or another project's article | Skip; check again on the next run. |
| Integrations API | `429` | Over 60 requests per minute on this key | Back off (see [rate-limits.md](rate-limits.md)). |
| MCP project tools | `RankScore login failed` / `rejected the login session` | Wrong email or password, the session was refused, or MFA is enabled on the account (not supported) | Check the plugin settings; if the account has MFA, use an account without it. No retry loop. |
| MCP project tools | `project_id is required` | No default project set | Ask for the id from `/dashboard/projects/<id>`. |
| MCP project tools | `HTTP 404` | Wrong project id, or another account's project | Ask for the right project id. |
| MCP job tools | `HTTP 429 ... (limit n, resets t)` | Quota used up | Report the limit and reset time. Never retry. |
| MCP | tool not in the tool list | Setting not set | API key, email and password, or "Enable write tools". |
