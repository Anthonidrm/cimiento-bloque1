#!/usr/bin/env bash
# Valida la migración en un PostgreSQL local (sin Supabase). Requiere psql y un servidor local.
# Uso:  supabase/tests/run.sh   (con PGHOST/PGUSER definidos o ejecutando como el usuario postgres)
set -euo pipefail
cd "$(dirname "$0")"
DB=cimiento_test
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d $DB -f stub_auth.sql
for m in ../migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d $DB -f "$m"; done
for t in rls_test.sql rls_test_0*.sql; do [ -f "$t" ] && psql -v ON_ERROR_STOP=1 -q -d $DB -f "$t" > /dev/null; done
psql -q -d $DB -f summary.sql -P pager=off -t -A
