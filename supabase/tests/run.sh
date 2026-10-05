#!/usr/bin/env bash
# Valida la migración en un PostgreSQL local (sin Supabase). Requiere psql y un servidor local.
# Uso:  supabase/tests/run.sh   (con PGHOST/PGUSER definidos o ejecutando como el usuario postgres)
set -euo pipefail
cd "$(dirname "$0")"
DB=cimiento_test
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d $DB -f stub_auth.sql
psql -v ON_ERROR_STOP=1 -q -d $DB -f ../migrations/0001_cimiento_base.sql
psql -q -d $DB -f rls_test.sql -P pager=off -t -A
