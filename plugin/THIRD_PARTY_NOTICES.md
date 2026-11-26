# Third-party notices

This plugin is MIT licensed (`LICENSE`). It is unofficial: it is not affiliated with or endorsed by RankScore or SE Ranking.

The skills in `skills/`, the shared references in `references/`, the Python scripts in `scripts/` and the installers in `extensions/` are adapted from other projects under the MIT License. Their notices follow.

## SE Ranking seo-skills

- Source: https://github.com/seranking/seo-skills, commit `a681ed5` (v2.11.6).
- License: MIT, Copyright (c) 2026 SE Ranking. Full text: `LICENSE-SE-Ranking.txt`.
- Covers: every skill in `skills/`, `references/preflight.md` and `references/output-conventions.md` (adapted), and `extensions/`.
- Changes: the skills were rewritten to use the RankScore MCP server instead of the SE Ranking MCP server. Steps that need data RankScore does not have were removed or replaced with WebSearch/WebFetch steps. SE Ranking branding, links and example outputs were removed. Five skills were not ported (seo-ads, seo-backlink-gap, seo-competitor-gap-analysis, seo-subdomain, seo-agency-landing-page), and two were merged (local-gmb-visibility into seo-local, seo-keyword-niche into seo-keyword-cluster).

## AgriciDaniel claude-seo

- Source: https://github.com/AgriciDaniel/claude-seo (v1.9.6), as forked by SE Ranking seo-skills.
- License: MIT, Copyright (c) 2026 agricidaniel. Full text: `LICENSE-AgriciDaniel.txt`.
- Covers: `scripts/*.py`, `skills/seo-google/references/`, `skills/seo-google/assets/templates/`, and the parts of any skill that credit AgriciDaniel/claude-seo in their own text (among them `seo-google`, `seo-hreflang`, `seo-images`, `seo-local`, `seo-drift` and `seo-sxo`, which were adapted from claude-seo skills).

## Bundled npm packages

`server/index.mjs` bundles the MCP server with its npm dependencies (`@modelcontextprotocol/sdk`, `zod` and their dependencies). Their license notices are kept at the end of that file.
