#!/usr/bin/env bash
# <plugin root>/extensions/firecrawl/uninstall.sh — remove firecrawl-mcp from Claude Code
# (installed for the RankScore plugin's skills).
#
# Removes the user-scope firecrawl-mcp server only (`claude mcp remove
# firecrawl-mcp --scope user`, or the mcpServers entry in ~/.claude.json when
# the CLI is not on PATH). Also removes the stale entry that older versions of
# install.sh wrote to ~/.claude/settings.json. Other MCP servers are kept.
# Does NOT remove the npm package cache (run `npm cache clean` for a deeper
# purge).

set -euo pipefail

CLAUDE_HOME="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if [ -n "${CLAUDE_CONFIG_DIR:-}" ]; then
  CLAUDE_JSON="$CLAUDE_CONFIG_DIR/.claude.json"
else
  CLAUDE_JSON="$HOME/.claude.json"
fi
LEGACY_SETTINGS="$CLAUDE_HOME/settings.json"
SERVER_NAME="firecrawl-mcp"

remove_entry() {
  # $1 = JSON file. Removes mcpServers.<SERVER_NAME>; other entries are kept.
  python3 - "$1" "$SERVER_NAME" <<'PYEOF'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
name = sys.argv[2]
try:
    data = json.loads(path.read_text())
except json.JSONDecodeError as exc:
    print(f"Error: {path} is not valid JSON ({exc}).", file=sys.stderr)
    sys.exit(1)
servers = data.get("mcpServers") if isinstance(data, dict) else None
if not isinstance(servers, dict) or name not in servers:
    print(f"{name} not present in {path}; nothing to remove there.")
    sys.exit(0)
del servers[name]
path.write_text(json.dumps(data, indent=2) + "\n")
print(f"Removed mcpServers.{name} from {path}.")
PYEOF
}

if command -v claude >/dev/null 2>&1; then
  if claude mcp remove "$SERVER_NAME" --scope user; then
    echo "Removed $SERVER_NAME (user scope)."
  else
    echo "$SERVER_NAME is not registered at user scope; nothing to remove there."
  fi
elif [ -f "$CLAUDE_JSON" ]; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: neither the 'claude' CLI nor 'python3' is on PATH." >&2
    exit 1
  fi
  echo "'claude' CLI not found: editing $CLAUDE_JSON. Close every Claude Code session first."
  remove_entry "$CLAUDE_JSON"
else
  echo "No $CLAUDE_JSON and no 'claude' CLI; nothing to remove there."
fi

if [ -f "$LEGACY_SETTINGS" ] && command -v python3 >/dev/null 2>&1; then
  remove_entry "$LEGACY_SETTINGS"
fi

echo "Start a new Claude Code session (or run /mcp) to pick up the change."
