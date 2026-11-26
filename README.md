# rankscore-mcp

> **Unofficial.** This project is not affiliated with, endorsed by or supported by RankScore. "RankScore" is used only to say which service it works with. Most tools use RankScore's undocumented dashboard API, which can change or break at any time.

An MCP server for RankScore, and a Claude Code plugin (`plugin/`) that bundles the server with 25 SEO skills. MIT licensed (see `LICENSE`).

- **MCP server** (`src/`): stdio, read tools for your RankScore project, and opt-in write tools.
- **Plugin** (`plugin/`): the server as one bundled file, plus skills for content briefs and audits, keyword clusters, AI-search visibility, backlinks, drift monitoring, technical, local and on-page SEO, and planning. The skills are adapted from [SE Ranking seo-skills](https://github.com/seranking/seo-skills) (MIT) to run on RankScore data. See `plugin/THIRD_PARTY_NOTICES.md`.

## Install the plugin in Claude Code

```sh
/plugin marketplace add <github-user>/rankscore-mcp   # or a local clone: /plugin marketplace add ~/projects/rankscore-mcp
/plugin install rankscore@rankscore-mcp
```

Claude Code then asks for the plugin settings. All of them are optional:

| Setting | Enables |
|---|---|
| RankScore API key | `list_articles`, `get_article` |
| Account email and password | All project reads (content plan, keywords, AI visibility, backlinks, listing, ...) |
| Default project id | The project used when a tool gets no `project_id` (UUID from `/dashboard/projects/<id>`) |
| Enable write tools | 18 tools that change data or start jobs (off by default) |
| Credentials file | Instead of the fields: a file with the key, email and password on lines 1-3 (mode 600) |

The API key and the password are stored as sensitive values: in the macOS Keychain, or in `~/.claude/.credentials.json` on Windows and Linux (treat that file like a password). The other settings go to `pluginConfigs` in your user `settings.json`. The plugin needs Node.js 20 or later on the PATH. If no credentials are set, the `rankscore` server does not start (`/mcp` shows "Connection closed"); skills that need no RankScore data still work.

The settings dialog opens in the interactive `/plugin` interface of a terminal session. `claude plugin install` run from a shell does not prompt. To set or change the settings later:

- In a session: `/plugin` > Installed > rankscore > Configure options, or `/plugin configure rankscore@rankscore-mcp`.
- From a shell (Claude Code 2.1.285 or later): `claude plugin configure rankscore@rankscore-mcp --values-stdin < values.json`, where `values.json` holds keys such as `{"email": "...", "project_id": "..."}`. Add `--json` to list which settings are set.

Restart Claude Code after a change. On Windows, a credentials file path must be a Windows path (for example `\\wsl.localhost\<distro>\home\<you>\rankscorekey`), because the server runs on Windows.

To try the plugin without installing it: `claude --plugin-dir ~/projects/rankscore-mcp/plugin`.

## Skills

Each skill reads only your own RankScore project. Where it needs data RankScore does not have (other domains, competitor keywords and backlinks, search results outside keyword discovery), it says so and uses a labelled WebSearch / WebFetch stand-in or skips the step. Write tools are only proposed, with cost and undo, and run on your yes.

| Area | Skills |
|---|---|
| Content | `seo-content-brief`, `seo-content-audit`, `seo-keyword-cluster` (includes long-tail mode), `seo-competitor-pages` |
| AI search | `seo-ai-search-share-of-voice`, `seo-geo` |
| Site and pages | `seo-technical-audit`, `seo-page`, `seo-sxo`, `seo-sitemap`, `seo-hreflang`, `seo-schema`, `seo-images` |
| Authority and tracking | `seo-backlinks-profile`, `seo-drift` |
| Local | `seo-local` (includes Google Business Profile visibility) |
| Planning | `seo-plan`, `client-onboarding-proposal` |
| Social (needs the Planable MCP server) | `seo-gaps-to-social-campaign`, `ai-search-gaps-to-social-campaign`, `seo-ai-social-report`, `site-audit-to-social-distribution` |
| Tools | `seo-firecrawl`, `seo-google` (Search Console, PageSpeed, CrUX, GA4 via Python scripts), `seo-api` (RankScore API recipes) |

Not ported, because they need competitor or ad data that RankScore does not have: seo-ads, seo-backlink-gap, seo-competitor-gap-analysis, seo-subdomain, seo-agency-landing-page.

Optional extras: Firecrawl for raw HTML (`bash plugin/extensions/firecrawl/install.sh`) and Google APIs (`bash plugin/extensions/google/install.sh`). The skills run without them and say what they skipped.

## MCP tools

| Set | Needs | Tools | API |
|---|---|---|---|
| Articles | API key | `list_articles`, `get_article` | [Documented API](https://help.rankscore.co/article/15-rankscore-api), stable |
| Project reads | Email and password | `get_content_plan`, `get_calendar`, `get_next_actions`, `get_ai_visibility`, `get_ai_visibility_response`, `get_ai_visibility_suggestions`, `get_keyword_discovery_runs`, `get_keyword_discovery_run`, `get_keyword_serp`, `get_keyword_bookmarks`, `get_ranked_keywords_report`, `get_listing`, `get_backlink_report` | The dashboard's own JSON API. **Not documented by RankScore. It can change or break without notice.** |
| Project writes | Email and password, and `RANKSCORE_ENABLE_WRITES=1` | 18 tools, below | Same undocumented API |

`plugin/references/rankscore-tools.md` is the full reference: arguments, returned fields, costs and undo for every tool.

### Articles tools (API key)

| Tool | API call | Notes |
|---|---|---|
| `list_articles` | `GET /articles` | `limit` 1-500 (default 20), `offset` (default 0). Summaries only. Returns `has_more` and `next_offset`. |
| `get_article` | `GET /articles/:id` | `id` required. `format`: `markdown` (default), `html` or `both`. |

Get a key in RankScore: **Integrations → API → Manage → Generate API key**. The key is shown once.

### Project reads (email and password)

These tools sign in the way the dashboard login page does: Supabase Auth with your email and password. The session stays in memory. The server sends it as the dashboard session cookie, signs in again when it expires, and never writes it to disk.

Each tool takes an optional `project_id` (UUID), which defaults to `RANKSCORE_PROJECT_ID`. The dashboard has no project-list endpoint.

- `get_keyword_discovery_run(run_id)` gives a run's keywords with search volume, CPC, opportunity score and difficulty tier. `get_keyword_serp(run_id, keyword_id)` gives the top 10 results for one of them (`raw_json` only with `include_raw_json`).
- `get_ai_visibility_response(judgement_id)` gives the full AI answer behind a judgement. `get_ai_visibility` leaves out each judgement's `raw_output` unless `include_raw_output` is true.
- `get_backlink_report` has `max_rows` (default 50), because the full report holds over 1,000 rows.

### Project writes (opt-in)

Set `RANKSCORE_ENABLE_WRITES=1` (plugin: "Enable write tools"). The tools are marked as not read-only, so a client can ask before it runs one. The request bodies were copied from what the dashboard itself sends. One write (`set_content_plan_item_status`) was checked live with `npm run live-write-check`; the others are tested against a mock server only.

**Edits:** `add_calendar_entry` (RankScore generates the article on that date, so it can use credits), `set_content_plan_item_status`, `dismiss_next_action`, `toggle_keyword_bookmark`, `add_tracked_keyword`, `create_keyword_group`, `rename_keyword_group`, `add_keywords_to_group`, `remove_keyword_from_group`, `set_ai_visibility_config` (**replaces the query list**: send every query to keep).

**Jobs** (credits or quota; HTTP 429 says when the limit resets, and a refused write is never repeated): `generate_article`, `generate_content_plan` (`rebuild` replaces the plan), `start_keyword_discovery_run`, `check_tracked_keyword_positions`, `refresh_ranked_keywords_report`, `refresh_backlink_report`, `run_site_health`, `generate_listing_description`.

**Not included, on purpose:** deleting anything, publishing to a CMS or the business listing, editing the listing, updating a calendar entry, and the CMS endpoints (their responses can hold stored credentials). See [docs/dashboard-endpoints.md](docs/dashboard-endpoints.md).

## Security

- With email and password set, the server holds your account password. Anyone who can run it or read its config can use your account. Use the plugin settings (Keychain on macOS, `~/.claude/.credentials.json` elsewhere) or a credentials file with mode 600, never a password in a shared MCP config.
- MFA is not supported: an account with MFA on may be rejected.
- The password is only sent to an https login URL (http only for localhost). Redirects are never followed, so a redirect cannot carry the password, the cookie or the key to another host.
- After a failed login the server waits 30 seconds before it sends the password again. It does not retry a login or a write on HTTP 429.
- Errors never contain the password, email, key or token. A key with line breaks or other characters that cannot go in a header is rejected at startup, without printing it.

## Use the server without the plugin

```sh
npm install
npm run build
```

| Variable | Meaning |
|---|---|
| `RANKSCORE_CREDENTIALS_FILE` | File with the API key on line 1, the email on line 2 and the password on line 3. Empty lines are fine. |
| `RANKSCORE_API_KEY` | API key. Overrides line 1. |
| `RANKSCORE_EMAIL`, `RANKSCORE_PASSWORD` | Account login. Set both or neither. Override lines 2 and 3. |
| `RANKSCORE_PROJECT_ID` | Default project for the project tools. |
| `RANKSCORE_ENABLE_WRITES` | `1`, `true` or `yes` registers the write tools. Default off. |
| `RANKSCORE_API_BASE` | Default `https://dashboard.rankscore.co/api/integrations/v1` |
| `RANKSCORE_DASHBOARD_ORIGIN` | Default `https://dashboard.rankscore.co` |
| `RANKSCORE_SUPABASE_URL`, `RANKSCORE_SUPABASE_ANON_KEY` | Defaults are the public values in RankScore's login page. |

```sh
claude mcp add rankscore --env RANKSCORE_CREDENTIALS_FILE=$HOME/rankscorekey --env RANKSCORE_PROJECT_ID=<project-uuid> -- node /absolute/path/to/rankscore-mcp/dist/index.js
```

Do not add the server by hand and install the plugin at the same time: the tools would be there twice.

## Behavior

- API errors come back as tool errors (`isError`) with the HTTP status and the message from the API.
- On HTTP 429 a GET is retried twice (it honors `Retry-After`, up to 30 s). The article API limit is 60 requests per minute.
- When the dashboard answers 401, the server signs in again once, then reports the error and pauses for 30 seconds.
- Each request times out after 30 s. Logs go to stderr; stdout carries the MCP protocol only.

## Development

```sh
npm run typecheck
npm test                  # build, bundle, then vitest against local mock servers
npm run bundle            # plugin/server/index.mjs (commit it: the plugin runs this file)
npm run validate:skills   # frontmatter, size, tool names, leftovers, links of plugin/skills
npm run validate:plugin   # claude plugin validate --strict (plugin and marketplace)
npm run live-check -- <project-uuid>
npm run live-write-check -- <project-uuid> --yes
```

`plugin/` has no `package.json` on purpose: Claude Code runs `npm install` for any plugin that has one. The bundle carries the dependencies instead. Rebuild it with `npm run bundle` after any change in `src/`.

`live-check` calls the real services with the credentials file (default `~/rankscorekey`) and prints status, sizes and key names. `live-write-check` changes the status of the first content-plan cluster's pillar article and changes it back. Neither prints credentials or article text. Run them yourself.

## Layout

```
src/                     MCP server (TypeScript)
test/                    vitest, mock RankScore and Supabase servers
scripts/                 bundle, live checks, skill validator
plugin/
  .claude-plugin/plugin.json   manifest, settings, MCP server entry
  server/index.mjs             bundled server
  skills/<name>/SKILL.md       25 skills (+ references/, templates/)
  references/                  tool catalog, preflight, output conventions shared by the skills
  scripts/                     Google API scripts (Python)
  extensions/                  Firecrawl and Google installers
.claude-plugin/marketplace.json   makes this repo a plugin marketplace
docs/dashboard-endpoints.md       the dashboard's endpoints and request bodies
```
