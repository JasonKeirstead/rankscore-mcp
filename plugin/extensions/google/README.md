# Google APIs extension for the RankScore plugin

Optional Google APIs integration that powers the `seo-google` skill: Search Console, PageSpeed Insights, CrUX field data, Indexing API, GA4, YouTube, Natural Language, Knowledge Graph, Web Risk and Google Ads Keyword Planner. RankScore has none of this data. Without this extension `seo-google` cannot run; the other skills still run and say `Google enrichment: not configured` where they would have used it.

> **Adapted from [`AgriciDaniel/claude-seo`](https://github.com/AgriciDaniel/claude-seo)** (MIT). The Python scripts in the plugin's `scripts/` folder are forks of the upstream `seo-google` skill, with the config path set to `~/.config/seo-skills/`.

Paths below: `<plugin root>` is the plugin's folder, the one that holds `.claude-plugin/`, `scripts/`, `skills/` and `extensions/`. From a skill it is `<skill dir>/../..`, where `<skill dir>` is the skill's base directory shown when the skill loads.

## What this enables

| Skill | What the Google APIs add |
|---|---|
| `seo-google` | All commands across PSI / CrUX / GSC / Indexing / GA4 / YouTube / NLP / Knowledge Graph / Web Risk / Keyword Planner / report generation, lined up with RankScore project data. |
| `seo-technical-audit` | Real CWV field data from CrUX plus Lighthouse lab data from PSI; real indexation status from URL Inspection. |
| `seo-page` | Measured GSC impressions, clicks, CTR and position next to RankScore's traffic estimate; indexation from URL Inspection. |
| `seo-drift` | 25-week CrUX history and URL Inspection drift in baseline/compare snapshots. |
| `seo-sitemap` | GSC sitemap status: which sitemaps Google has processed, with their error and warning counts. |
| `seo-content-audit` | GA4 traffic and GSC queries for the audited page; NLP entity/sentiment input to E-E-A-T scoring. |
| `seo-geo` | GSC Search Analytics filtered to AI Overview appearances. |
| `seo-ai-search-share-of-voice` | GA4 referral sessions from AI assistants next to RankScore AI visibility. |
| `seo-keyword-cluster` | Tier-3 Keyword Planner volumes for keywords RankScore has no volume for. |
| `seo-plan` | Real impressions, clicks and traffic in the baseline when Tier 1+ is configured. |

## Requirements

- **Python 3.10+** (`python3 --version`).
- `pip` for python3 (`python3 -m pip --version`).
- A free Google Cloud project with the relevant APIs enabled. See [`skills/seo-google/references/auth-setup.md`](../../skills/seo-google/references/auth-setup.md) for the 8-step walkthrough.
- All Google APIs used here are **free** within their quotas (see "Rate limits" below). Natural Language and Web Risk need billing enabled on the project; their free tiers still apply.

## Install

```bash
bash <plugin root>/extensions/google/install.sh
```

The script:

1. Checks Python 3.10+ and pip.
2. Runs `pip install --user --upgrade` (no `--user` inside a virtualenv) of:
   - **Core**: `google-api-python-client`, `google-auth`, `google-auth-oauthlib`, `google-auth-httplib2`, `google-analytics-data`, `google-analytics-admin`, `requests`.
   - **Reports** (matplotlib + weasyprint + openpyxl): optional. If system libraries are missing (cairo/pango on Linux, Xcode CLT on macOS), the install warns and continues; only the `report` command is then unavailable.
3. Creates `~/.config/seo-skills/` (mode 700) and writes a stub `google-api.json` (mode 600) for you to fill in.
4. Runs the credential checker to report the unlocked tier.

It does not install `google-ads`. For Keyword Planner (Tier 3) run `python3 -m pip install --user google-ads`. Tier 3 also needs OAuth with the Google Ads scope (a service account does not work for the Ads API): `python3 <plugin root>/scripts/google_auth.py --auth --ads --creds /path/to/client_secret.json`, then set `oauth_client_path` in the config. See `skills/seo-google/references/keyword-planner-api.md`. Tier 3 has not been tested end to end in this plugin.

`google-analytics-admin` is used by `scripts/ga4_admin.py` (the `ga4-properties` command: list the GA4 properties the credentials can read). It also needs the Google Analytics Admin API enabled in the Cloud project.

After install, fill in `~/.config/seo-skills/google-api.json` as described in the [auth-setup walkthrough](../../skills/seo-google/references/auth-setup.md). Then re-run the credential checker:

```bash
python3 <plugin root>/scripts/google_auth.py --check
```

## Uninstall

```bash
bash <plugin root>/extensions/google/uninstall.sh
```

Removes `~/.config/seo-skills/google-api.json` and `~/.config/seo-skills/oauth-token.json`. Does **not** uninstall the pip libraries (other tools may use them; uninstall them by hand if needed). Does **not** delete service-account JSON files referenced by `service_account_path`.

## Credential tiers

| Tier | What's configured | What's unlocked |
|------|-------------------|------------------|
| **0** | API key only | PSI, CrUX, CrUX History, YouTube, NLP, Knowledge Graph, Web Risk |
| **1** | + service account (added to GSC as "Full" user) or OAuth token | + GSC Search Analytics, URL Inspection, Sitemaps, Indexing API, GA4 property discovery |
| **2** | + GA4 property ID + service account added as Viewer | + GA4 traffic, landing pages, referrals, channel mix |
| **3** (unverified) | + OAuth token with the Google Ads scope + `oauth_client_path` + Google Ads developer token + customer ID + `google-ads` library | + Keyword Planner ideas and volumes |

Each tier is useful on its own: Tier 0 alone gives real CWV field data. Higher tiers unlock more.

## Rate limits

| API | Per-Minute | Per-Day | Auth |
|-----|-----------|---------|------|
| PageSpeed Insights v5 | 240 QPM | 25,000 QPD | API Key |
| CrUX + History | 150 QPM (shared) | Unlimited | API Key |
| GSC Search Analytics | 1,200 QPM/site | 30M QPD | Service Account |
| GSC URL Inspection | 600 QPM | **2,000 QPD/site** | Service Account |
| Indexing API | 380 RPM | **200 publish/day** | Service Account |
| GA4 Data API | 10 concurrent | ~25K tokens/day | Service Account |
| YouTube Data API v3 | — | 10,000 units/day | API Key |
| Cloud Natural Language | — | 5,000 units/month free | API Key (billing required) |

The two budgets to watch are **GSC URL Inspection (2,000/day per site)** and **Indexing API (200 publish/day)**: both have hard daily caps that the scripts report.

## Troubleshooting

- **`No credentials found`** after install: the stub config exists but its fields are empty. Open `~/.config/seo-skills/google-api.json` and follow `skills/seo-google/references/auth-setup.md`.
- **`403 Forbidden` on GSC**: the service account email is not added to the GSC property as a Full user. GSC > Settings > Users and permissions > Add user, paste `client_email`, set Full.
- **`403 Forbidden` on GA4**: the service account email is not added to the GA4 property as Viewer. GA Admin > Property Access Management > Add users.
- **`404 Not Found` on CrUX**: the URL or origin has too little Chrome traffic for CrUX. Not an auth issue; use PSI lab data instead.
- **`429 Rate Limit`**: wait and retry; `skills/seo-google/references/rate-limits-quotas.md` shows which API hit its cap.
- **`weasyprint` install fails on Linux**: install the system libraries first, `apt install libpango-1.0-0 libpangoft2-1.0-0`. On macOS, install the Xcode Command Line Tools.
- **`API not enabled`**: enable the API in [Google Cloud Console > APIs & Services > Library](https://console.cloud.google.com/apis/library).

## License

The installers are adapted from SE Ranking seo-skills (MIT). The forked Python scripts, the `seo-google` references and the report templates keep [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)'s MIT copyright (Copyright © 2026 AgriciDaniel); see `LICENSE-AgriciDaniel.txt` in this directory. Full notices: `../../THIRD_PARTY_NOTICES.md`.
