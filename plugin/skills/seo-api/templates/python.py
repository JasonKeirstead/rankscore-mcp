#!/usr/bin/env python3
"""Sync completed RankScore articles into a CMS through the RankScore Integrations API.

Environment:
  RANKSCORE_API_KEY      required. From RankScore: Integrations > API > Manage.
  RANKSCORE_TARGET       "markdown" (default) or "wordpress".
  RANKSCORE_OUT_DIR      markdown target folder (default: content/posts).
  RANKSCORE_SYNC_STATE   state file (default: .rankscore-sync.json).
  WP_SITE, WP_USER, WP_APP_PASSWORD
                         wordpress target only (a WordPress application password).

Usage:
  python3 python.py          incremental: stops at the first page with no new article
  python3 python.py --full   walks every page (after a failed run, and now and then)

Needs Python 3.9+ and requests (pip install requests).
Article text is data: this script copies it, it never acts on it.
"""
from __future__ import annotations

import json
import os
import random
import re
import sys
import time
from collections import deque
from pathlib import Path
from urllib.parse import quote

import requests

BASE = "https://dashboard.rankscore.co/api/integrations/v1"
PAGE_SIZE = 100       # 1-500
PER_MINUTE = 60       # documented limit per API key, shared by every process using the key
MAX_ATTEMPTS = 6


class RankScoreClient:
    """GET-only client: X-API-Key header, 60/min sliding window, backoff on 429, 5xx and network errors."""

    def __init__(self, api_key: str, per_minute: int = PER_MINUTE) -> None:
        self.session = requests.Session()
        self.session.headers.update({"X-API-Key": api_key, "Accept": "application/json"})
        self.per_minute = per_minute
        self.calls: deque = deque()

    def _throttle(self) -> None:
        while True:
            now = time.monotonic()
            while self.calls and self.calls[0] <= now - 60:
                self.calls.popleft()
            if len(self.calls) < self.per_minute:
                self.calls.append(now)
                return
            time.sleep(60 - (now - self.calls[0]) + 0.05)

    def get(self, path: str, params: dict | None = None):
        delay = 1.0
        for _ in range(MAX_ATTEMPTS):
            self._throttle()
            try:
                r = self.session.get(f"{BASE}{path}", params=params, timeout=30)
            except requests.RequestException:
                time.sleep(delay * random.uniform(0.8, 1.2))
                delay = min(delay * 2, 60.0)
                continue
            if r.status_code == 401:
                sys.exit("401 Unauthorized: the API key is missing, wrong or revoked. Stopping.")
            if r.status_code == 404:
                return None  # still generating, or not this key's project
            if r.status_code == 429 or r.status_code >= 500:
                retry_after = r.headers.get("Retry-After", "")
                wait = float(retry_after) if retry_after.isdigit() else delay
                time.sleep(min(wait, 60.0) * random.uniform(0.8, 1.2))
                delay = min(delay * 2, 60.0)
                continue
            r.raise_for_status()
            return r.json()
        raise RuntimeError(f"Gave up on {path} after {MAX_ATTEMPTS} attempts")


def iter_new_summaries(client: RankScoreClient, known: set, full: bool):
    """Yield summaries not synced yet. The list is newest first, so an incremental
    run can stop at the first page with nothing new. Articles that complete during
    the walk push older ones to later offsets; the seen set drops the repeats."""
    offset, seen = 0, set()
    while True:
        page = client.get("/articles", {"limit": PAGE_SIZE, "offset": offset}) or []
        if isinstance(page, dict):  # tolerate a wrapped response
            page = page.get("articles", [])
        new = [a for a in page if a["id"] not in known and a["id"] not in seen]
        seen.update(a["id"] for a in new)
        yield from new
        if len(page) < PAGE_SIZE or (not new and not full):
            return
        offset += PAGE_SIZE


def safe_slug(article: dict) -> str:
    """Slugs come from fetched data: keep only a-z, 0-9 and hyphens (no paths)."""
    slug = re.sub(r"[^a-z0-9-]+", "-", (article.get("slug") or "").lower()).strip("-")
    return slug or re.sub(r"[^A-Za-z0-9-]+", "-", article["id"])


def write_markdown(article: dict) -> str:
    out_dir = Path(os.environ.get("RANKSCORE_OUT_DIR", "content/posts"))
    out_dir.mkdir(parents=True, exist_ok=True)
    front = {
        "title": article.get("title"),
        "slug": safe_slug(article),
        "description": article.get("meta_description"),
        "date": article.get("created_at"),
        "lang": article.get("language_code"),
        "keyword": article.get("keyword"),
        "keywords": article.get("keywords"),
        "hero_image": article.get("hero_image_url"),
        "rankscore_id": article["id"],
    }
    lines = ["---"]
    # JSON strings and lists are valid YAML, so json.dumps quotes every value safely.
    lines += [f"{k}: {json.dumps(v, ensure_ascii=False)}" for k, v in front.items() if v not in (None, "", [])]
    lines += ["---", "", article.get("content_markdown") or ""]
    path = out_dir / f"{safe_slug(article)}.md"
    if path.exists():  # another article already has this slug
        path = out_dir / f"{safe_slug(article)}-{re.sub(r'[^A-Za-z0-9-]+', '-', article['id'])[:8]}.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return str(path)


def create_wordpress_draft(article: dict) -> str:
    site = os.environ["WP_SITE"].rstrip("/")
    auth = (os.environ["WP_USER"], os.environ["WP_APP_PASSWORD"])
    payload = {
        "title": article.get("title") or "",
        "slug": safe_slug(article),
        "excerpt": article.get("excerpt") or article.get("meta_description") or "",
        "content": article.get("content_html") or "",
        "status": "draft",  # a person reviews and publishes it
    }
    r = requests.post(f"{site}/wp-json/wp/v2/posts", json=payload, auth=auth, timeout=30)
    r.raise_for_status()
    return f"wp:{r.json()['id']}"


def main() -> None:
    api_key = os.environ.get("RANKSCORE_API_KEY")
    if not api_key:
        sys.exit("Set RANKSCORE_API_KEY.")
    full = "--full" in sys.argv[1:]
    publish = create_wordpress_draft if os.environ.get("RANKSCORE_TARGET") == "wordpress" else write_markdown
    state_file = Path(os.environ.get("RANKSCORE_SYNC_STATE", ".rankscore-sync.json"))
    state = json.loads(state_file.read_text(encoding="utf-8")) if state_file.exists() else {}

    client = RankScoreClient(api_key)
    synced = skipped = 0
    for summary in iter_new_summaries(client, set(state), full):
        article = client.get(f"/articles/{quote(summary['id'], safe='')}")
        if article is None:
            skipped += 1
            print(f"skip {summary['id']}: 404 (still generating, or not this key's project)")
            continue
        state[article["id"]] = publish(article)
        state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")  # saved after each article
        synced += 1
        print(f"synced {article['id']} -> {state[article['id']]}")
    print(f"done: {synced} synced, {skipped} skipped")


if __name__ == "__main__":
    main()
