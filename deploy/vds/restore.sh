#!/bin/sh
# Restore a BudgetBuddy backup made by backup.sh. See docs/vds.md
# ("Restoring a backup") before running this against anything but a local stack.
#
# Usage:
#   RESTORE_DATABASE_URL=postgresql://... restore.sh <backup-dir> --yes-replace-all-data
#
# <backup-dir> is one dated folder, e.g. /var/backups/budgetbuddy/db/2026-11-16T0230Z,
# holding public.dump, auth.dump and SHA256SUMS.
#
# The target database must already have the schema: every migration in
# supabase/migrations applied (a local `supabase db reset`, or a new hosted
# project after `supabase db push`). This script then REPLACES all rows in the
# public schema and all user accounts (auth.users, auth.identities) with the
# backup's rows.
#
# Optional: RESTORE_STORAGE_REMOTE (an rclone remote for the target project's
# Storage S3 endpoint) plus RESTORE_FILES_DIR (default: <backup-dir>/../../files/current)
# also uploads the receipt and avatar files.
set -eu

SRC="${1:-}"
CONFIRM="${2:-}"
[ -n "$SRC" ] && [ -d "$SRC" ] || { echo "usage: RESTORE_DATABASE_URL=... $0 <backup-dir> --yes-replace-all-data" >&2; exit 2; }
: "${RESTORE_DATABASE_URL:?set RESTORE_DATABASE_URL to the TARGET database}"
case "$SRC" in /*|?:/*) ;; *) SRC="$(pwd)/$SRC" ;; esac
PG_IMAGE="${BACKUP_PG_IMAGE:-postgres:17-alpine}"
RCLONE_IMAGE="${BACKUP_RCLONE_IMAGE:-rclone/rclone:1.68.2}"
NETWORK="${BACKUP_DOCKER_NETWORK:-host}"
RCLONE_CONFIG="${BACKUP_RCLONE_CONFIG:-/opt/budgetbuddy/rclone.conf}"

TARGET_HOST="$(printf '%s' "$RESTORE_DATABASE_URL" | sed -E 's#^[a-z]+://([^@]*@)?([^/:?]+).*#\2#')"
echo "restore: backup  $SRC"
echo "restore: target  host $TARGET_HOST"
if [ "$CONFIRM" != "--yes-replace-all-data" ]; then
  echo "restore: this deletes every row in the target's public schema and auth users." >&2
  echo "restore: re-run with --yes-replace-all-data as the second argument to continue." >&2
  exit 2
fi

( cd "$SRC" && sha256sum -c SHA256SUMS ) || { echo "restore: checksum mismatch, aborting" >&2; exit 1; }

pg() {
  docker run --rm -i --network "$NETWORK" -e DB_URL="$RESTORE_DATABASE_URL" \
    -v "$SRC:/in:ro" "$PG_IMAGE" sh -ec "$1"
}

echo "restore: checking that the target has the BudgetBuddy schema"
pg 'psql "$DB_URL" -v ON_ERROR_STOP=1 -qtAc "select 1 from public.users limit 0"' </dev/null >/dev/null \
  || { echo "restore: public.users not found; apply the migrations first" >&2; exit 1; }

echo "restore: replacing data (one transaction: all or nothing)"
# The SQL below is sent on stdin, then both dumps are streamed after it into
# one psql transaction. Replica mode skips triggers and foreign-key checks,
# so rows load in any order and app triggers do not fire twice.
# "commit" is sent only after both dumps were read in full; if anything fails
# the stream ends inside the open transaction and PostgreSQL rolls it back.
pg 'set -o pipefail
{ cat &&
  pg_restore --file=- --data-only --no-owner /in/auth.dump &&
  pg_restore --file=- --data-only --no-owner --schema=public /in/public.dump &&
  echo "commit;"
} | psql "$DB_URL" -v ON_ERROR_STOP=1 -q -o /dev/null' <<'SQL'
begin;
set local client_min_messages = warning;
set local session_replication_role = replica;
select 'truncate table ' || string_agg(format('%I.%I', schemaname, tablename), ', ')
       || ' restart identity cascade'
  from pg_tables where schemaname = 'public' having count(*) > 0
\gexec
truncate table auth.identities, auth.users cascade;
SQL

echo "restore: row counts in the target"
pg 'psql "$DB_URL" -qtA -F " "' <<'SQL'
select 'auth.users', count(*) from auth.users
union all select 'public.users', count(*) from public.users
union all select 'public.accounts', count(*) from public.accounts
union all select 'public.transactions', count(*) from public.transactions;
SQL

if [ -n "${RESTORE_STORAGE_REMOTE:-}" ]; then
  FILES="${RESTORE_FILES_DIR:-$SRC/../../files/current}"
  [ -d "$FILES" ] || { echo "restore: no Storage files at $FILES" >&2; exit 1; }
  echo "restore: uploading Storage files from $FILES to $RESTORE_STORAGE_REMOTE"
  for bucket_dir in "$FILES"/*/; do
    bucket="$(basename "$bucket_dir")"
    docker run --rm --network "$NETWORK" \
      -v "$RCLONE_CONFIG:/config/rclone/rclone.conf:ro" -v "$FILES:/files:ro" \
      "$RCLONE_IMAGE" mkdir "$RESTORE_STORAGE_REMOTE:$bucket" || true
    docker run --rm --network "$NETWORK" \
      -v "$RCLONE_CONFIG:/config/rclone/rclone.conf:ro" -v "$FILES:/files:ro" \
      "$RCLONE_IMAGE" copy "/files/$bucket" "$RESTORE_STORAGE_REMOTE:$bucket"
  done
fi

echo "restore: done"
