#!/usr/bin/env bash
# One-time: create ~/.config/jpindia-github-master/frontend.env.local from .env.template
# then edit that file ONCE with real keys. Daily: `npm run dev` syncs it into .env.local.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MASTER_DIR="${JP_INDIA_ENV_DIR:-$HOME/.config/jpindia-github-master}"
MASTER="$MASTER_DIR/frontend.env.local"

mkdir -p "$MASTER_DIR"
if [[ ! -f "$MASTER" ]]; then
  if [[ -f "$ROOT/.env.template" ]]; then
    cp "$ROOT/.env.template" "$MASTER"
  else
    touch "$MASTER"
  fi
  chmod 600 "$MASTER"
  echo ""
  echo "Created master env (edit ONCE, keep forever):"
  echo "  $MASTER"
  echo ""
  echo "Open it in your editor, replace placeholders with real keys, save, then:"
  echo "  npm run dev"
  echo ""
else
  echo "Master env already exists: $MASTER"
fi

bash "$ROOT/scripts/pull-env-from-home.sh"
