#!/usr/bin/env bash
# RankScore Integrations API from the shell. Needs curl 7.76+ and jq.
#
#   RANKSCORE_API_KEY=... ./curl.sh check             200 = key works, 401 = wrong or revoked
#   RANKSCORE_API_KEY=... ./curl.sh page              one page of summaries (LIMIT, OFFSET)
#   RANKSCORE_API_KEY=... ./curl.sh article ID        one article with its body
#   RANKSCORE_API_KEY=... ./curl.sh export [DIR]      every article as DIR/ID.json
#
# Read the key from the environment or a secret store. Never put it in the URL.
set -euo pipefail

: "${RANKSCORE_API_KEY:?Set RANKSCORE_API_KEY}"
BASE="https://dashboard.rankscore.co/api/integrations/v1"

# --retry retries 429 and 5xx with a growing delay and honours Retry-After.
# It does not retry 401 or 404; --fail-with-body makes those exit non-zero.
rs_get() {
  curl -sS --fail-with-body --retry 5 --max-time 30 \
    -H "X-API-Key: ${RANKSCORE_API_KEY}" -H "Accept: application/json" "${BASE}$1"
}

rs_status() {
  curl -sS -o /dev/null -w '%{http_code}' -H "X-API-Key: ${RANKSCORE_API_KEY}" "${BASE}/articles?limit=1"
}

case "${1:-check}" in
  check)
    rs_status
    echo
    ;;
  page)
    rs_get "/articles?limit=${LIMIT:-20}&offset=${OFFSET:-0}" | jq .
    ;;
  article)
    rs_get "/articles/${2:?article id}" | jq .
    ;;
  export)
    out="${2:-rankscore-articles}"
    code=$(rs_status)
    if [ "$code" != "200" ]; then
      echo "API key check returned HTTP $code (401 = missing, wrong or revoked key)" >&2
      exit 1
    fi
    mkdir -p "$out"
    offset=0
    while :; do
      page=$(rs_get "/articles?limit=500&offset=${offset}")
      count=$(jq '(if type == "array" then . else .articles end) | length' <<<"$page")
      for id in $(jq -r '(if type == "array" then . else .articles end)[].id' <<<"$page"); do
        # ids come from fetched data: only use safe ones as file names
        [[ "$id" =~ ^[A-Za-z0-9-]+$ ]] || continue
        [ -s "$out/$id.json" ] && continue
        sleep 1 # stay under 60 requests per minute
        if rs_get "/articles/$id" >"$out/$id.json.tmp"; then
          mv "$out/$id.json.tmp" "$out/$id.json"
        else
          rm -f "$out/$id.json.tmp"
          echo "skip $id (404 = still generating, or not this key's project)" >&2
        fi
      done
      [ "$count" -lt 500 ] && break
      offset=$((offset + 500))
      sleep 1
    done
    echo "exported to $out" >&2
    ;;
  *)
    echo "usage: $0 check | page | article ID | export [DIR]" >&2
    exit 2
    ;;
esac
