#!/usr/bin/env bash
# Builds a throwaway Postgres, loads the schema the way Supabase would, migrates seed.json, runs the RLS tests.
set -euo pipefail
cd "$(dirname "$0")"
BIN=/usr/lib/postgresql/16/bin
DATA=/tmp/pg/data PORT=55432
export PGHOST=/tmp/pg PGPORT=$PORT
asu() { su postgres -s /bin/bash -c "$*"; }

asu "$BIN/pg_ctl -D $DATA stop -m fast" >/dev/null 2>&1 || true
rm -rf $DATA; mkdir -p /tmp/pg; chown postgres /tmp/pg
asu "$BIN/initdb -D $DATA -U postgres -A trust" >/dev/null
asu "$BIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp/pg -c listen_addresses=' -l /tmp/pg/log -w start" >/dev/null

SU="psql -X -q -v ON_ERROR_STOP=1 -U postgres"
$SU -d postgres -c "create role tugun_owner login nosuperuser nobypassrls"
$SU -d postgres -c "create database tugun owner tugun_owner"
$SU -d postgres -c "select 1" >/dev/null; $SU -d tugun -c "create role tugun_owner" 2>/dev/null || true; $SU -d tugun -f db/test/auth_stub.sql
$SU -d tugun -c "grant anon, authenticated, service_role to tugun_owner; grant create on database tugun to tugun_owner;"
OWN="psql -X -q -v ON_ERROR_STOP=1 -U tugun_owner -d tugun"
# pgcrypto is a trusted extension: the database owner may create it (as on Supabase)
$OWN -f db/001_schema.sql
$OWN -f db/002_security.sql
$OWN -f db/003_foundation.sql
$OWN -f db/004_telegram_login.sql
echo "schema: ok"

python3 migrate/export_to_sql.py ../legacy/seed.json /tmp/pg/migration.sql --include-demo
time $OWN -f /tmp/pg/migration.sql
echo "migration: ok"

python3 db/test/test_rls.py
