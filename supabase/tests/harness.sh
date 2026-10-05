#!/usr/bin/env bash
# Entorno local equivalente a Supabase para PROBAR la integración: PostgreSQL + PostgREST + proxy /rest/v1.
# Requisitos: PostgreSQL (psql, servidor local) y el binario `postgrest` en el PATH. Uso: harness.sh up | down
set -euo pipefail
cd "$(dirname "$0")"
DB=cimiento_test; SECRET="cimiento-local-test-secret-0123456789abcdef"
case "${1:-up}" in
  up)
    (pg_lsclusters 2>/dev/null | grep -q online) || { pg_ctlcluster 16 main start; sleep 3; }
    su postgres -c "psql -v ON_ERROR_STOP=1 -q -d postgres -c 'drop database if exists $DB' -c 'create database $DB'"
    su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f $PWD/stub_auth.sql"
    for m in ../migrations/*.sql; do su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f $PWD/$m"; done
    for sd in ../seed/*.sql; do su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f $PWD/$sd"; done
    [ "${WITH_USERS:-0}" = "1" ] && su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f $PWD/seed_integration.sql" || true
    cat > /tmp/pgrst.conf << CONF
db-uri = "postgres://authenticator:authpass@127.0.0.1:5432/$DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = 3000
CONF
    (pg_lsclusters 2>/dev/null | grep -q online) || pg_ctlcluster 16 main start
    setsid nohup postgrest /tmp/pgrst.conf > /tmp/pgrst.log 2>&1 < /dev/null &
    setsid nohup node proxy.mjs > /tmp/proxy.log 2>&1 < /dev/null &
    sleep 3; curl -s -o /dev/null -w "PostgREST responde: %{http_code}\n" http://127.0.0.1:54321/rest/v1/ ;;
  down) pkill -x postgrest || true; pkill -f "[p]roxy.mjs" || true ;;
esac
