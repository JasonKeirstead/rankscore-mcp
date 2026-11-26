#!/usr/bin/env bash
# <plugin root>/extensions/firecrawl/install.sh — register firecrawl-mcp with Claude Code
# for the RankScore plugin's skills.
#
# What this does:
#   1. Verify Node 20+ and npx.
#   2. Ask for FIRECRAWL_API_KEY (or read it from the environment).
#   3. Register the server at user scope:
#        claude mcp add firecrawl-mcp --scope user -e FIRECRAWL_API_KEY=... -- npx -y firecrawl-mcp
#      Claude Code keeps user-scope MCP servers in ~/.claude.json, not in
#      ~/.claude/settings.json. If the `claude` CLI is not on PATH, merge the
#      same entry into ~/.claude.json with python3 (the key goes to python3
#      through the environment, not the command line).
#   4. Remove a stale mcpServers.firecrawl-mcp entry that older versions of
#      this script wrote to ~/.claude/settings.json (Claude Code never read it).
#   5. Pre-warm the npm package and print the available tools.
#
# Idempotent: re-running replaces the firecrawl-mcp entry; other MCP servers
# are kept.
#
# Note: with the CLI path, the key is on the `claude` command line while that
# command runs (a second or less). Claude Code stores it in plain text in
# ~/.claude.json; this script sets that file to mode 600.

set -euo pipefail

CLAUDE_HOME="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if [ -n "${CLAUDE_CONFIG_DIR:-}" ]; then
  CLAUDE_JSON="$CLAUDE_CONFIG_DIR/.claude.json"
else
  CLAUDE_JSON="$HOME/.claude.json"
fi
LEGACY_SETTINGS="$CLAUDE_HOME/settings.json"
SERVER_NAME="firecrawl-mcp"

red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

# --- 1. Dependency checks -----------------------------------------------------

if ! command -v node >/dev/null 2>&1; then
  red "Error: 'node' not found on PATH."
  echo "Install Node 20+ from https://nodejs.org or via your package manager."
  exit 1
fi

NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  red "Error: Node $NODE_MAJOR detected; firecrawl-mcp requires Node 20+."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  red "Error: 'npx' not found on PATH."
  echo "npx ships with npm (Node 20+ includes both). Re-install Node if missing."
  exit 1
fi

HAVE_CLAUDE=0
if command -v claude >/dev/null 2>&1; then
  HAVE_CLAUDE=1
fi

if [ "$HAVE_CLAUDE" -eq 0 ] && ! command -v python3 >/dev/null 2>&1; then
  red "Error: neither the 'claude' CLI nor 'python3' is on PATH."
  echo "Install Claude Code (it provides 'claude mcp add'), or python3 for the fallback merge into $CLAUDE_JSON."
  exit 1
fi

green "✓ Node $(node -v), npx $(npx --version)"

# --- 2. API key ---------------------------------------------------------------

if [ -z "${FIRECRAWL_API_KEY:-}" ]; then
  bold "Enter your Firecrawl API key (https://firecrawl.dev — free tier is 500 credits/month):"
  read -r -s FIRECRAWL_API_KEY
  echo ""
  if [ -z "$FIRECRAWL_API_KEY" ]; then
    red "No API key entered. Aborting."
    exit 1
  fi
fi
export FIRECRAWL_API_KEY

# --- 3. Register the MCP server (user scope) ----------------------------------

if [ "$HAVE_CLAUDE" -eq 1 ]; then
  # `claude mcp add` refuses a name that already exists: remove it first.
  claude mcp remove "$SERVER_NAME" --scope user >/dev/null 2>&1 || true
  if ! claude mcp add "$SERVER_NAME" --scope user \
      -e "FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY" \
      -- npx -y firecrawl-mcp; then
    red "Error: 'claude mcp add' failed. Nothing was registered."
    exit 1
  fi
  green "✓ Registered $SERVER_NAME at user scope with 'claude mcp add'."
else
  bold "'claude' CLI not found: merging $SERVER_NAME into $CLAUDE_JSON instead."
  echo "  Close every Claude Code session first: a running session can overwrite this file."
  python3 - "$CLAUDE_JSON" "$SERVER_NAME" <<'PYEOF'
import json
import os
import sys
from pathlib import Path

path = Path(sys.argv[1])
name = sys.argv[2]
api_key = os.environ["FIRECRAWL_API_KEY"]

data = {}
if path.exists():
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        print(f"Error: {path} is not valid JSON ({exc}). Aborting.", file=sys.stderr)
        sys.exit(1)
    if not isinstance(data, dict):
        print(f"Error: {path} root must be an object. Aborting.", file=sys.stderr)
        sys.exit(1)

servers = data.setdefault("mcpServers", {})
existed = name in servers
servers[name] = {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "firecrawl-mcp"],
    "env": {"FIRECRAWL_API_KEY": api_key},
}

tmp = path.with_name(path.name + ".tmp")
old_umask = os.umask(0o077)
try:
    tmp.write_text(json.dumps(data, indent=2) + "\n")
finally:
    os.umask(old_umask)
os.replace(tmp, path)
print(f"{'Updated' if existed else 'Added'} mcpServers.{name} in {path}")
PYEOF
fi

# The key is stored in plain text: keep the file private.
if [ -f "$CLAUDE_JSON" ]; then
  chmod 600 "$CLAUDE_JSON" 2>/dev/null || true
fi

# --- 4. Remove the stale settings.json entry from older installs --------------

if [ -f "$LEGACY_SETTINGS" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$LEGACY_SETTINGS" "$SERVER_NAME" <<'PYEOF'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
name = sys.argv[2]
try:
    data = json.loads(path.read_text())
except (json.JSONDecodeError, OSError):
    sys.exit(0)
servers = data.get("mcpServers") if isinstance(data, dict) else None
if isinstance(servers, dict) and name in servers:
    del servers[name]
    if not servers:
        del data["mcpServers"]
    path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Removed the unused mcpServers.{name} entry (and its API key) from {path}")
PYEOF
fi

# --- 5. Pre-warm --------------------------------------------------------------

bold "Pre-warming firecrawl-mcp..."
npx -y firecrawl-mcp --version </dev/null >/dev/null 2>&1 || true

green "✓ firecrawl-mcp installed."
echo ""
bold "Available tools (prefix mcp__firecrawl-mcp__):"
cat <<'TOOLS'
  - firecrawl_scrape          (single URL → markdown, rawHtml, links, metadata, optional screenshot)
  - firecrawl_map             (single domain → URL list)
  - firecrawl_crawl           (single domain → all pages)
  - firecrawl_check_crawl_status  (poll long-running crawl jobs)
  - firecrawl_search          (search within a domain)
  - firecrawl_extract         (LLM extraction — not used by the RankScore plugin skills)
  - firecrawl_deep_research   (not used by the RankScore plugin skills)
TOOLS

echo ""
bold "Next steps:"
echo "  1. Start a new Claude Code session (MCP servers load at session start)."
echo "  2. Verify: 'claude mcp list' or '/mcp' should list 'firecrawl-mcp' as connected."
echo "  3. Try: '/rankscore:seo-firecrawl scrape https://example.com'"
echo ""
bold "Free tier: 500 credits/month. See https://firecrawl.dev/pricing for paid tiers."
