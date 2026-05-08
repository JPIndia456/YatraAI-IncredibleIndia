#!/usr/bin/env bash
# Restore frontend/.env.local from a canonical copy OUTSIDE the repo so workspace resets
# or cloud episodes cannot wipe your keys.
#
# 1. Create once (pick any stable path):
#    mkdir -p ~/.config/jpindia-github-master
#    nano ~/.config/jpindia-github-master/frontend.env.local
#
# 2. From frontend/: npm run env:pull
#
# Override source path:
#    JP_INDIA_ENV_FILE=/path/to/my.env npm run env:pull

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${JP_INDIA_ENV_FILE:-$HOME/.config/jpindia-github-master/frontend.env.local}"
DST="$ROOT/.env.local"

if [[ ! -f "$SRC" ]]; then
  echo "Missing env source file: $SRC"
  echo "Create it with your real keys (copy from .env.template once), then run again."
  exit 1
fi

cp "$SRC" "$DST"
chmod 600 "$DST" 2>/dev/null || true
echo "Copied → $DST"
