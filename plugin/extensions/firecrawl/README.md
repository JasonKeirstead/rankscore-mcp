# Firecrawl extension for the RankScore plugin

Optional Firecrawl MCP integration. It gives the plugin's skills JS rendering, raw `<head>` access, JSON-LD parsing and full-site crawling, which neither RankScore nor WebFetch provides. Without it, the Firecrawl steps in the skills write `(skipped: Firecrawl not installed)` and the skills run on WebFetch plus RankScore data. Only `seo-firecrawl` itself needs it.

Firecrawl sends each URL you scrape or crawl to firecrawl.dev and bills it under Firecrawl's own terms.

Paths below: `<plugin root>` is the plugin's folder, the one that holds `.claude-plugin/`, `skills/` and `extensions/`. From a skill it is `<skill dir>/../..`, where `<skill dir>` is the skill's base directory shown when the skill loads.

## What this enables

| Skill | What Firecrawl adds |
|---|---|
| `seo-page` | OG / Twitter / canonical / robots / JSON-LD recovery for the page |
| `seo-schema` | A real JSON-LD parse of the target URL and of competing pages |
| `seo-geo` | `/llms.txt` and RSL discovery, and a JSON-LD-backed schema check |
| `seo-technical-audit` | JS-render canonical/noindex divergence (rendered `rawHtml` against the initial HTML). Firecrawl does not return response headers: `X-Robots-Tag` comes from the skill's own header check |
| `seo-sitemap` | URL discovery with `firecrawl_map` for sites with a broken or missing sitemap |
| `seo-content-audit` | Real Article schema and DOM byline (feeds the AI-content YMYL check) |
| `seo-content-brief` | The real `<head>` of top-ranking pages for the on-page benchmark |
| `seo-competitor-pages` | Bulk on-page element extraction for the comparison-page CSV |
| `seo-sxo` | Optional rendered screenshots of top-ranking pages |
| `seo-backlinks-profile` | Optional check that linking pages still link, with the expected `rel` |
| `seo-drift` | Full `<head>` and JSON-LD content in URL-mode snapshots |
| `seo-firecrawl` | Direct scrape / map / crawl / search interface |

## Requirements

- Node 20 or newer (`node -v`).
- `npx` (ships with npm).
- The `claude` CLI (Claude Code) on PATH. Without it, the script needs `python3` to merge the entry into `~/.claude.json` itself.
- A Firecrawl API key from <https://firecrawl.dev>. The free tier is **500 credits a month**.

## Install

```bash
bash <plugin root>/extensions/firecrawl/install.sh
```

The script:

1. Checks Node 20+ and `npx`.
2. Asks for `FIRECRAWL_API_KEY` (or reads it from your environment).
3. Registers the server at user scope: `claude mcp add firecrawl-mcp --scope user -e FIRECRAWL_API_KEY=... -- npx -y firecrawl-mcp`. Claude Code keeps user-scope MCP servers in `~/.claude.json` (not in `~/.claude/settings.json`, which Claude Code does not read for MCP servers). If the `claude` CLI is not on PATH, the script merges the same entry into `~/.claude.json` with `python3`; close every Claude Code session before you run it that way. Other MCP servers are kept. The script sets `~/.claude.json` to mode 600, because the key is stored there in plain text.
4. Removes the unused `mcpServers.firecrawl-mcp` entry (and its key) that older versions of this script wrote to `~/.claude/settings.json`.
5. Pre-warms the npm package and prints the available tool names.

Start a new Claude Code session so the server loads. Check with `claude mcp list` or `/mcp`: `firecrawl-mcp` should show as connected.

You can also register it by hand with the same `claude mcp add` command.

## Uninstall

```bash
bash <plugin root>/extensions/firecrawl/uninstall.sh
```

Runs `claude mcp remove firecrawl-mcp --scope user` (or removes the entry from `~/.claude.json` when the CLI is not on PATH), and removes any old entry from `~/.claude/settings.json`. Other MCP servers are kept.

## Free-tier credit math

Each Firecrawl-using skill states its own estimate in its step 1; that estimate is the one to trust. As a guide, on the 500-credit free tier:

- A one-page scrape (`seo-page`, a `seo-drift` URL snapshot) costs about 1 credit.
- `seo-geo` costs about 3 credits, `seo-technical-audit` about 6.
- `seo-schema` costs up to about 11 credits when it benchmarks competing pages.
- `seo-content-audit` costs about 1 credit per page crawled (50 at a 50-page cap).

Heavy runs (a `seo-sitemap` discovery of a 200-page site, `seo-content-audit` at a 200-page cap, `seo-firecrawl` in `crawl` mode) use credits fast. Every Firecrawl-using skill shows its estimate first, and accepts `--no-firecrawl` (except `seo-firecrawl` itself) when budget matters more than completeness.

## Tool prefix

After install, the tools are exposed as:

- `mcp__firecrawl-mcp__firecrawl_scrape`
- `mcp__firecrawl-mcp__firecrawl_map`
- `mcp__firecrawl-mcp__firecrawl_crawl`
- `mcp__firecrawl-mcp__firecrawl_check_crawl_status`
- `mcp__firecrawl-mcp__firecrawl_search`
- `mcp__firecrawl-mcp__firecrawl_extract` (the skills do not use this)
- `mcp__firecrawl-mcp__firecrawl_deep_research` (the skills do not use this)

The skills look for the `mcp__firecrawl-mcp__` prefix. If `/mcp` shows the server under another name, the skills will not find it: uninstall that entry and re-run `install.sh`, which registers it as `firecrawl-mcp`.

## Troubleshooting

- **`/mcp` does not show firecrawl-mcp:** run `claude mcp list`. If `firecrawl-mcp` is missing there, re-run `install.sh`. If it is listed, start a new Claude Code session: MCP servers load at session start. An entry under `mcpServers` in `~/.claude/settings.json` is not read; `install.sh` removes the one that older versions wrote.
- **`mcp__firecrawl-mcp__firecrawl_scrape` returns auth errors:** re-run `install.sh` and enter the API key again. The previous one may have been revoked.
- **Free-tier credits used up:** the Firecrawl-using skills accept `--no-firecrawl` and run in degraded mode. Or upgrade at <https://firecrawl.dev/pricing>.
- **Cloudflare / WAF blocking:** some sites block Firecrawl's scraper. The error shows in the skill's output; getting past a WAF is out of scope.

## License

Adapted from SE Ranking seo-skills (MIT). See `../../THIRD_PARTY_NOTICES.md`.
