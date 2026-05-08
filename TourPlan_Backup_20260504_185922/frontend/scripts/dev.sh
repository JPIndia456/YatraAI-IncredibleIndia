#!/usr/bin/env bash
# Optional bootstrap from ~/.config/.../frontend.env.local — never overwrites an existing
# .env.local unless you explicitly set ENV_SYNC_FROM_MASTER=1 (or run npm run env:pull).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${JP_INDIA_ENV_FILE:-$HOME/.config/jpindia-github-master/frontend.env.local}"
DST="$ROOT/.env.local"

if [[ -f "$SRC" ]]; then
  if [[ ! -f "$DST" ]]; then
    cp "$SRC" "$DST"
    chmod 600 "$DST" 2>/dev/null || true
    echo "[dev] Created .env.local from $SRC (no .env.local yet)"
  elif [[ "${ENV_SYNC_FROM_MASTER:-}" == "1" ]]; then
    cp "$SRC" "$DST"
    chmod 600 "$DST" 2>/dev/null || true
    echo "[dev] Overwrote .env.local from $SRC (ENV_SYNC_FROM_MASTER=1)"
  fi
fi

cd "$ROOT"
exec "$ROOT/node_modules/.bin/next" dev "$@"
