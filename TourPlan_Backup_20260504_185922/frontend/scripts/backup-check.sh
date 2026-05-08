#!/usr/bin/env bash
# Reports unpushed / uncommitted work so nothing is lost before shutdown.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
RST='\033[0m'

die_msg() {
  echo -e "${RED}$1${RST}" >&2
}

info() {
  echo -e "${YLW}$1${RST}"
}

ok() {
  echo -e "${GRN}$1${RST}"
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TourPlan backup-check  ($(basename "$ROOT"))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  die_msg "Not a git repository."
  exit 2
}

git fetch origin -q 2>/dev/null || info "Note: git fetch origin failed (offline?) — unpushed counts may be stale."

count_dirty_not_env_local() {
  # $1 = optional path to repo (default: current dir, already frontend root)
  local repo="${1:-.}"
  local line n=0
  local -a g=(git)
  [[ "$repo" != "." ]] && g+=(-C "$repo")
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    [[ "$line" == *".env.local"* ]] && continue
    n=$((n + 1))
  done < <("${g[@]}" status --porcelain 2>/dev/null || true)
  echo "$n"
}

BR=$(git rev-parse --abbrev-ref HEAD)
echo ""
echo "--- Frontend: git status (${BR}) ---"
git status -sb

DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
DIRTY_OTHER=$(count_dirty_not_env_local)
PDIRTY=0
PDIRTY_OTHER=0
PUN=0

UNPUSHED=0
if git rev-parse --verify "@{u}" >/dev/null 2>&1; then
  UNPUSHED=$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)
elif git rev-parse --verify "origin/${BR}" >/dev/null 2>&1; then
  UNPUSHED=$(git rev-list --count "origin/${BR}..HEAD" 2>/dev/null || echo 0)
else
  info "No upstream / no origin/${BR} — set with: git push -u origin ${BR}"
fi

echo ""
if [ "${UNPUSHED}" != "0" ]; then
  echo "--- Frontend: ${UNPUSHED} commit(s) not on remote ---"
  if git rev-parse --verify "@{u}" >/dev/null 2>&1; then
    git log "@{u}..HEAD" --oneline
  elif git rev-parse --verify "origin/${BR}" >/dev/null 2>&1; then
    git log "origin/${BR}..HEAD" --oneline
  fi
else
  ok "Frontend: branch is not ahead of remote (or cannot compare)."
fi

PARENT="$(cd "${ROOT}/.." && pwd)"
if [ -e "${PARENT}/.git" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Parent repo"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  git -C "${PARENT}" fetch origin -q 2>/dev/null || true
  echo ""
  git -C "${PARENT}" status -sb
  PB=$(git -C "${PARENT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
  PDIRTY=$(git -C "${PARENT}" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  PDIRTY_OTHER=$(count_dirty_not_env_local "${PARENT}")
  PUN=0
  if git -C "${PARENT}" rev-parse --verify "@{u}" >/dev/null 2>&1; then
    PUN=$(git -C "${PARENT}" rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)
  elif git -C "${PARENT}" rev-parse --verify "origin/${PB}" >/dev/null 2>&1; then
    PUN=$(git -C "${PARENT}" rev-list --count "origin/${PB}..HEAD" 2>/dev/null || echo 0)
  fi
  echo ""
  if [ "${PUN}" != "0" ]; then
    echo "--- Parent: ${PUN} commit(s) not on remote ---"
    if git -C "${PARENT}" rev-parse --verify "@{u}" >/dev/null 2>&1; then
      git -C "${PARENT}" log "@{u}..HEAD" --oneline
    elif git -C "${PARENT}" rev-parse --verify "origin/${PB}" >/dev/null 2>&1; then
      git -C "${PARENT}" log "origin/${PB}..HEAD" --oneline
    fi
  else
    ok "Parent: not ahead of remote (or cannot compare)."
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  .env.local (never in git — back it up separately)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "${ROOT}/.env.local" ]; then
  ok "Present: ${ROOT}/.env.local"
else
  info "Missing: ${ROOT}/.env.local (create from .env.template if needed)"
fi

if [ "${DIRTY}" != "0" ] && [ "${DIRTY_OTHER}" = "0" ]; then
  echo ""
  info "Only .env.local differs from git — OK for secrets; copy it somewhere safe separately."
fi

echo ""
if [ "${DIRTY_OTHER}" != "0" ] || [ "${PDIRTY_OTHER}" != "0" ] || [ "${UNPUSHED}" != "0" ] || [ "${PUN}" != "0" ]; then
  info "→ To save work: git add / git commit / git push (frontend + parent if both changed)"
  info "→ Reminder: .env.local is only on this machine unless you copy it somewhere safe."
  exit 1
fi

ok "All clear: nothing to push and no tracked-code edits pending (excluding .env.local-only noise)."
exit 0
