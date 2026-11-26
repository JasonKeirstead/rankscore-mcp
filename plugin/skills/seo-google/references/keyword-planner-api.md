# Google Ads API - Keyword Planner Reference

Google's own source for keyword search volume. In this plugin it fills the gap RankScore leaves: RankScore has volumes only for keywords from its discovery runs (`get_keyword_discovery_run`) and for keywords the project ranks for or tracks (`get_ranked_keywords_report`).

## Prerequisites (More Complex Than Other Google APIs)

1. **Google Ads Manager Account** -- create at ads.google.com (free to create)
2. **Developer Token** -- apply at Google Ads API Center (requires Basic access approval)
3. **OAuth 2.0 with the Google Ads scope** -- a service account alone does **not** work for the Ads API, so a Tier 1 setup that uses only `service_account_path` cannot run Keyword Planner. Create an OAuth client (APIs & Services > Credentials > Create Credentials > OAuth client ID, type "Desktop app" or "Web application" with the redirect URI `http://localhost:8085`), download its JSON, then sign in once with the Ads scope:

   ```bash
   python3 <skill dir>/../../scripts/google_auth.py --auth --ads --creds /path/to/client_secret.json
   ```

   `<skill dir>` is the seo-google skill's base directory, shown when the skill loads. `--ads` adds `https://www.googleapis.com/auth/adwords` to the usual scopes. Sign in with a Google account that has access to the Ads account in `ads_customer_id`. The token goes to `~/.config/seo-skills/oauth-token.json`. Then set `oauth_client_path` in the config (below): `keyword_planner.py` reads the client id and secret from that file, and token refresh needs it too.
4. **For exact volumes**: Run a minimal campaign (~$5-10/day). Without spend, volumes are bucketed ranges ("1K-10K")

**Status: unverified.** The `keywords` and `volume` commands have not been tested end to end against the Google Ads API in this plugin. If a call fails, report the script's error and skip Keyword Planner data.

## Key Methods

### GenerateKeywordIdeas
Generate keyword suggestions from seed terms. Script command: `ideas`.

**Returns per keyword:**
- `text`: Keyword string
- `avg_monthly_searches`: Average monthly volume (exact if spending, bucketed if not)
- `competition`: LOW / MEDIUM / HIGH (for ads, not organic)
- `competition_index`: 0-100 competition score
- `low_top_of_page_bid_micros`: ~20th percentile CPC in micros
- `high_top_of_page_bid_micros`: ~80th percentile CPC in micros
- `monthly_search_volumes[]`: Per-month volume for last 12 months

### GenerateKeywordHistoricalMetrics
Get volume data for specific keywords. Script command: `volume`.

Same return fields as above but for exact keyword list instead of suggestions.

### GenerateKeywordForecastMetrics
Predict clicks, impressions, and cost for keywords. The shipped `keyword_planner.py` does not expose this method (its commands are `ideas` and `volume`).

## Configuration

Add to `~/.config/seo-skills/google-api.json`:

```json
{
  "oauth_client_path": "/path/to/client_secret.json",
  "ads_developer_token": "YOUR_DEV_TOKEN",
  "ads_customer_id": "123-456-7890",
  "ads_login_customer_id": "123-456-7890"
}
```

| Key | Meaning |
|---|---|
| `oauth_client_path` | The OAuth client JSON used with `google_auth.py --auth --ads`. Required. |
| `ads_developer_token` | From Google Ads API Center. Required. |
| `ads_customer_id` | The Ads account the requests run under. Required. |
| `ads_login_customer_id` | The manager account id, when you reach `ads_customer_id` through a manager account. |

`google_auth.py --check` does not report this tier. `keyword_planner.py` prints its own error when the OAuth token, its Ads scope, `oauth_client_path`, the developer token, the customer id or the library is missing.

## Rate Limits

- Keyword Planning requests are more strictly rate-limited than other Ads API services
- Exact QPM/QPS not publicly documented
- Google recommends caching results

## Python Library

```bash
python3 -m pip install --user google-ads
```

Uses `google-ads` library (separate from `google-api-python-client`). The plugin's `extensions/google/install.sh` does not install it.

## Important Notes

- **Volume accuracy**: Without active ad spend, Google returns bucketed ranges ("1K-10K", "10K-100K") instead of exact numbers like "14,800"
- **Competition score**: Measures advertiser competition for ads, NOT organic ranking difficulty. RankScore's `difficulty_tier` and `serp_weakness_score` (discovery-run keywords) are the organic signals; keep the two apart.
- **CPC bids**: Reflect what advertisers pay, useful for estimating keyword commercial value
- **Location targeting**: Use location IDs (2840 = United States, 2826 = United Kingdom)
- **Language targeting**: Use language IDs (1000 = English, 1003 = Spanish)
- **Label the source**: in a deliverable, mark these volumes "Google Ads Keyword Planner" and RankScore volumes "RankScore", in separate columns.
