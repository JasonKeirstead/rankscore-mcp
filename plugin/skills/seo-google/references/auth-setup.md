# Google API Authentication Setup

## Overview

Three credential types serve different APIs:

| Type | Used By | Cost |
|------|---------|------|
| **API Key** | PageSpeed Insights, CrUX, CrUX History, Knowledge Graph, YouTube, NLP, Web Risk | Free |
| **Service Account** (or an OAuth token) | Search Console, Indexing API, GA4 Data, GA4 Admin | Free |
| **OAuth token with the Google Ads scope + Google Ads developer token** | Keyword Planner (volumes / suggestions). A service account does not work here. | Free (token approval ~24h) |
| **Both** | Full seo-google skill | Free |

Paths below: `<skill dir>` is the seo-google skill's base directory, shown when the skill loads. The scripts are in `<skill dir>/../../scripts/`.

## Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** > **New Project**
3. Name it (e.g., "SEO APIs") and note the project ID
4. Select the project after creation

## Step 2: Enable APIs

Navigate to **APIs & Services > Library** and enable:

| API | Required For |
|-----|-------------|
| Google Search Console API | GSC Search Analytics, URL Inspection, Sitemaps |
| PageSpeed Insights API | PSI Lighthouse lab data |
| Chrome UX Report API | CrUX field data + History |
| Web Search Indexing API | Indexing API v3 |
| Google Analytics Data API | GA4 organic traffic |
| Google Analytics Admin API | `ga4-properties` (GA4 account and property discovery) |
| Knowledge Graph Search API | Entity verification |
| YouTube Data API v3 | `youtube` / `youtube-video` / `youtube-channel` commands |
| Cloud Natural Language API | `nlp` / `entities` commands |
| Web Risk API | `safety` command (malware / social-engineering check) |
| Google Ads API | `keywords` / `volume` commands (also requires a Google Ads developer token — see [`keyword-planner-api.md`](./keyword-planner-api.md)) |

## Step 3: Create an API Key

1. **APIs & Services > Credentials > Create Credentials > API key**
2. Click **Restrict key**:
   - Under **API restrictions**, select: PageSpeed Insights API, Chrome UX Report API, Knowledge Graph Search API, YouTube Data API v3, Cloud Natural Language API, Web Risk API
3. Copy the key (starts with `AIzaSy...`)

## Step 4: Create a Service Account

1. **IAM & Admin > Service Accounts > Create Service Account**
2. Name: `seo-skills` (or similar)
3. Skip optional permissions steps
4. Click on the created service account > **Keys > Add Key > Create new key > JSON**
5. Download the JSON file and store it securely (e.g., `~/.config/seo-skills/service_account.json`)

The JSON file looks like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "seo-skills@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

The `client_email` field is what you add to GSC and GA4.

Alternative to a service account: an OAuth client (APIs & Services > Credentials > Create Credentials > OAuth client ID; use the redirect URI `http://localhost:8085`). Run `python3 <skill dir>/../../scripts/google_auth.py --auth --creds /path/to/client_secret.json` to sign in through the browser; the token is saved to `~/.config/seo-skills/oauth-token.json`. Then set `oauth_client_path` to the client JSON in the config (Step 7): the token expires after one hour, and the refresh reads the client id and secret from that file.

Keyword Planner (Tier 3) needs OAuth: the Google Ads API does not accept a plain service account. Add `--ads` to request the Google Ads scope as well: `python3 <skill dir>/../../scripts/google_auth.py --auth --ads --creds /path/to/client_secret.json`. Details: [`keyword-planner-api.md`](./keyword-planner-api.md).

## Step 5: Grant Search Console Access

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. **Settings > Users and permissions > Add user**
4. Paste the service account `client_email`
5. Set permission level:
   - **Full** for read-only (Search Analytics, URL Inspection, Sitemaps)
   - **Owner** if you also need the Indexing API

## Step 6: Grant GA4 Access

1. Go to [Google Analytics](https://analytics.google.com)
2. **Admin > Property Access Management > Add users** (the + icon)
3. Paste the service account `client_email`
4. Set role: **Viewer** (minimum for read-only reporting)
5. Note the numeric property ID from **Admin > Property Details** (e.g., `123456789`)

## Step 7: Create Config File

```bash
mkdir -p ~/.config/seo-skills
```

Save to `~/.config/seo-skills/google-api.json` (the installer `<skill dir>/../../extensions/google/install.sh` writes an empty stub here):

```json
{
  "service_account_path": "~/.config/seo-skills/service_account.json",
  "api_key": "AIzaSy...",
  "default_property": "sc-domain:example.com",
  "ga4_property_id": "properties/123456789"
}
```

Optional keys:

| Key | When |
|---|---|
| `oauth_client_path` | You signed in with `--auth` (OAuth instead of, or as well as, a service account). Path to the OAuth client JSON. Needed for token refresh and for Keyword Planner. |
| `ads_developer_token`, `ads_customer_id`, `ads_login_customer_id` | Keyword Planner (Tier 3). See [`keyword-planner-api.md`](./keyword-planner-api.md). |

### Property URL Formats

| Format | Example | When to Use |
|--------|---------|-------------|
| Domain property | `sc-domain:example.com` | Covers all URLs on the domain (recommended) |
| URL-prefix property | `https://example.com/` | Covers only that specific prefix |

## Step 8: Verify Setup

```bash
python3 <skill dir>/../../scripts/google_auth.py --check
```

Expected output at Tier 2 (full):
```
Credential Tier: 2 -- Full (API key + Service Account + GA4)

  [OK] PageSpeed Insights v5
  [OK] Chrome UX Report (CrUX) API
  [OK] CrUX History API
  [OK] Google Search Console API
       Service account: seo-skills@your-project.iam.gserviceaccount.com
  [OK] Google Indexing API v3
  [OK] GA4 Data API v1beta
```

## Environment Variable Alternatives

Instead of (or in addition to) the config file:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_API_KEY` | API key for PSI/CrUX |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `GA4_PROPERTY_ID` | GA4 property (e.g., `properties/123456789`) |
| `GSC_PROPERTY` | Default GSC property (e.g., `sc-domain:example.com`) |

## OAuth Scopes Used

| Scope | APIs |
|-------|------|
| `https://www.googleapis.com/auth/webmasters.readonly` | GSC (read) |
| `https://www.googleapis.com/auth/webmasters` | GSC (read/write, needed for sitemap submission) |
| `https://www.googleapis.com/auth/indexing` | Indexing API |
| `https://www.googleapis.com/auth/analytics.readonly` | GA4 Data and GA4 Admin (read) |
| `https://www.googleapis.com/auth/adwords` | Google Ads API (Keyword Planner). Requested only with `--auth --ads`. |

`--auth` requests the `webmasters`, `indexing` and `analytics.readonly` scopes (plus `adwords` with `--ads`). A service account gets the scope each script asks for.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `403 Forbidden` on GSC | Service account email not added to GSC property, or wrong permission level |
| `403 Forbidden` on GA4 | Service account email not added to GA4 property as Viewer |
| `404 Not Found` on GSC | Wrong property URL format. Use `sc-domain:` or include trailing slash for URL-prefix |
| `404 Not Found` on CrUX | Site has insufficient Chrome traffic. Not a credentials issue. |
| `429 Rate Limit` | Wait and retry. See rate-limits-quotas.md for per-API limits |
| `API not enabled` | Enable the specific API in GCP Console > APIs & Services > Library |

Never paste the API key, the service-account JSON or the OAuth token into chat or into any report.
