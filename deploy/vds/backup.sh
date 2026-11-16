#!/bin/sh
# Daily BudgetBuddy backup: database dump + Storage files, kept locally and
# optionally copied off-site. See docs/vds.md ("Database and file backups").
#
# Usage: backup.sh [path/to/backup.env]   (default /opt/budgetbuddy/backup.env)
#
# Needs only Docker on the host: pg_dump and rclone run in pinned containers.
# The script only READS from the database and Storage.
set -eu

ENV_FILE="${1:-/opt/budgetbuddy/backup.env}"
[ -r "$ENV_FILE" ] || { echo "backup: cannot read $ENV_FILE" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is not set in $ENV_FILE}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/budgetbuddy}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
BACKUP_REMOTE_KEEP_DAYS="${BACKUP_REMOTE_KEEP_DAYS:-60}"
BACKUP_STORAGE_REMOTE="${BACKUP_STORAGE_REMOTE:-}"
BACKUP_STORAGE_BUCKETS="${BACKUP_STORAGE_BUCKETS:-budgetbuddy-receipts budgetbuddy-avatars}"
BACKUP_RCLONE_CONFIG="${BACKUP_RCLONE_CONFIG:-/opt/budgetbuddy/rclone.conf}"
BACKUP_HEALTHCHECK_URL="${BACKUP_HEALTHCHECK_URL:-}"
BACKUP_DOCKER_NETWORK="${BACKUP_DOCKER_NETWORK:-host}"
PG_IMAGE="${BACKUP_PG_IMAGE:-postgres:17-alpine}"
RCLONE_IMAGE="${BACKUP_RCLONE_IMAGE:-rclone/rclone:1.68.2}"

STAMP="$(date -u +%Y-%m-%dT%H%MZ)"
DEST="$BACKUP_DIR/db/$STAMP"
umask 077
mkdir -p "$DEST" "$BACKUP_DIR/files"

log() { echo "$(date -u +%FT%TZ) backup: $*"; }
fail() {
  log "FAILED: $*"
  [ -n "$BACKUP_HEALTHCHECK_URL" ] && curl -fsS -m 10 --retry 3 "$BACKUP_HEALTHCHECK_URL/fail" >/dev/null 2>&1 || true
  exit 1
}

pg() {
  # Pass the URL through the environment so it never appears in `ps` output.
  docker run --rm --network "$BACKUP_DOCKER_NETWORK" -e DB_URL="$BACKUP_DATABASE_URL" \
    -v "$DEST:/out" "$PG_IMAGE" sh -ec "$1"
}

rclone() {
  docker run --rm --network "$BACKUP_DOCKER_NETWORK" \
    -v "$BACKUP_RCLONE_CONFIG:/config/rclone/rclone.conf:ro" \
    -v "$BACKUP_DIR:/data" "$RCLONE_IMAGE" "$@"
}

log "dumping database to $DEST"
# public: full schema + data (restorable data-only or, if needed, schema too).
pg 'pg_dump "$DB_URL" --format=custom --compress=9 --no-owner --schema=public --file=/out/public.dump' \
  || fail "pg_dump public"
# auth: only the user accounts and their sign-in identities (data only). The
# auth schema itself is managed by Supabase and exists in every project.
pg 'pg_dump "$DB_URL" --format=custom --compress=9 --no-owner --data-only --table=auth.users --table=auth.identities --file=/out/auth.dump' \
  || fail "pg_dump auth"
# Quick self-check: both archives must be readable.
pg 'pg_restore --list /out/public.dump >/dev/null && pg_restore --list /out/auth.dump >/dev/null' \
  || fail "dump verification"
( cd "$DEST" && sha256sum public.dump auth.dump > SHA256SUMS )

if [ -n "$BACKUP_STORAGE_REMOTE" ]; then
  [ -r "$BACKUP_RCLONE_CONFIG" ] || fail "rclone config $BACKUP_RCLONE_CONFIG not readable"
  for bucket in $BACKUP_STORAGE_BUCKETS; do
    log "mirroring Storage bucket $bucket"
    # Files removed or changed in Storage are moved aside (dated), not lost.
    rclone sync "$BACKUP_STORAGE_REMOTE:$bucket" "/data/files/current/$bucket" \
      --backup-dir "/data/files/changed/$STAMP/$bucket" --create-empty-src-dirs \
      || fail "storage mirror $bucket"
  done
fi

log "pruning local dumps older than $BACKUP_KEEP_DAYS days"
find "$BACKUP_DIR/db" -mindepth 1 -maxdepth 1 -type d -mtime "+$BACKUP_KEEP_DAYS" -exec rm -rf {} +
[ -d "$BACKUP_DIR/files/changed" ] && \
  find "$BACKUP_DIR/files/changed" -mindepth 1 -maxdepth 1 -type d -mtime "+$BACKUP_KEEP_DAYS" -exec rm -rf {} +

if [ -n "$BACKUP_REMOTE" ]; then
  [ -r "$BACKUP_RCLONE_CONFIG" ] || fail "rclone config $BACKUP_RCLONE_CONFIG not readable"
  # "offsite:" + "db" -> "offsite:db"; "b2:bucket/dir" + "db" -> "b2:bucket/dir/db"
  remote() { case "$BACKUP_REMOTE" in *:) echo "$BACKUP_REMOTE$1" ;; *) echo "${BACKUP_REMOTE%/}/$1" ;; esac; }
  log "copying to off-site remote $BACKUP_REMOTE"
  rclone copy "/data/db/$STAMP" "$(remote "db/$STAMP")" || fail "off-site copy (db)"
  if [ -d "$BACKUP_DIR/files/current" ]; then
    rclone sync "/data/files/current" "$(remote files/current)" \
      --backup-dir "$(remote "files/changed/$STAMP")" || fail "off-site copy (files)"
  fi
  rclone delete "$(remote db)" --min-age "${BACKUP_REMOTE_KEEP_DAYS}d" || fail "off-site prune"
  rclone delete "$(remote files/changed)" --min-age "${BACKUP_REMOTE_KEEP_DAYS}d" 2>/dev/null || true
  rclone rmdirs "$BACKUP_REMOTE" --leave-root 2>/dev/null || true
fi

log "done: $(du -sh "$DEST" | cut -f1) in $DEST"
[ -n "$BACKUP_HEALTHCHECK_URL" ] && curl -fsS -m 10 --retry 3 "$BACKUP_HEALTHCHECK_URL" >/dev/null 2>&1 || true
