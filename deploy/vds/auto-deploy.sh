#!/bin/sh
# Automatic BudgetBuddy deploy: when `main` on GitHub has a new commit whose CI
# checks all passed, run the normal deploy. See docs/vds.md ("Automatic deploys").
#
# Run from cron every few minutes. The server asks GitHub; GitHub never connects
# to the server, so no SSH key or other secret is stored outside the server.
#
# Each commit is tried once: a commit whose CI failed, or whose deploy failed,
# is logged and not retried. Deploy it by hand after fixing the cause.
set -eu

REPO="${AUTO_DEPLOY_REPO:-melisau/budget-buddy}"
BRANCH="${AUTO_DEPLOY_BRANCH:-main}"
APP_DIR="${AUTO_DEPLOY_DIR:-/opt/budgetbuddy}"
DEPLOY_CMD="${AUTO_DEPLOY_CMD:-$APP_DIR/deploy/vds/deploy.sh}"
HEALTH_URL="${AUTO_DEPLOY_HEALTH_URL:-https://budgetbuddy.melisauyar.com/api/health}"
STATE_FILE="${AUTO_DEPLOY_STATE:-$APP_DIR/.auto-deploy-last}"
LOCK_FILE="${AUTO_DEPLOY_LOCK:-$APP_DIR/.auto-deploy.lock}"

log() { echo "$(date -u +%FT%TZ) auto-deploy: $*"; }

# One run at a time: a deploy can take longer than the cron interval.
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

sha="$(git ls-remote "https://github.com/$REPO.git" "refs/heads/$BRANCH" | cut -f1)"
case "$sha" in
  ????????????????????????????????????????) ;;
  *) log "could not read $BRANCH from GitHub"; exit 1 ;;
esac

last="$(cat "$STATE_FILE" 2>/dev/null || true)"
[ "$sha" = "$last" ] && exit 0

# CI gate: every check on the commit must have finished without a failure.
checks="$(curl -fsS -m 20 -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/$REPO/commits/$sha/check-runs?per_page=100")" \
  || { log "could not read CI status for $sha"; exit 1; }
conclusions="$(printf '%s' "$checks" | grep -o '"conclusion": *[a-z_"]*' | sed 's/.*: *//; s/"//g' || true)"

[ -n "$conclusions" ] || exit 0                               # CI has not started yet
printf '%s\n' "$conclusions" | grep -qx 'null' && exit 0      # CI is still running

bad="$(printf '%s\n' "$conclusions" | grep -vx -e success -e skipped -e neutral || true)"
if [ -n "$bad" ]; then
  log "SKIPPED $sha: CI did not pass ($(echo $bad)). Not deploying."
  echo "$sha" > "$STATE_FILE"
  exit 0
fi

log "deploying $sha"
echo "$sha" > "$STATE_FILE"
if ! "$DEPLOY_CMD" "$BRANCH"; then
  log "FAILED: deploy of $sha failed. The previous version may still be running; check and deploy by hand."
  exit 1
fi

if curl -fsS -m 20 --retry 5 --retry-delay 5 --retry-all-errors -o /dev/null "$HEALTH_URL"; then
  log "OK: $sha is live"
else
  log "FAILED: $sha was deployed but $HEALTH_URL does not answer"
  exit 1
fi
