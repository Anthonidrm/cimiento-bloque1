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

# --- El archivo único de despliegue (el que se pega en el SQL Editor) debe correr EN UNA SOLA TRANSACCIÓN sobre una base LIMPIA,
#     con sus semillas, y dejar el mismo esquema que las migraciones una a una. ---
DB2=cimiento_bundle
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB2" -c "create database $DB2"
psql -v ON_ERROR_STOP=1 -q -d $DB2 -f stub_auth.sql
psql -v ON_ERROR_STOP=1 -q -1 -d $DB2 -f ../despliegue/1_migraciones.sql
psql -v ON_ERROR_STOP=1 -q -1 -d $DB2 -f ../despliegue/2_semillas.sql
Q="select (select count(*) from information_schema.tables where table_schema='public') || ' tablas/vistas, ' || (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public') || ' funciones, ' || (select count(*) from pg_policies where schemaname in ('public','storage')) || ' políticas'"
A=$(psql -q -At -d $DB -c "$Q"); B=$(psql -q -At -d $DB2 -c "$Q")
echo "Esquema (migraciones una a una): $A"
echo "Esquema (archivo único + semillas): $B"
[ "$A" = "$B" ] && echo "ARCHIVO ÚNICO DE DESPLIEGUE: OK (una transacción, base limpia, mismo esquema)" || { echo "ARCHIVO ÚNICO: ESQUEMA DISTINTO"; exit 1; }
psql -q -At -d $DB2 -c "select 'Semillas cargadas: ' || (select count(*) from lessons where developed) || ' lecciones desarrolladas, ' || (select count(*) from exam_questions) || ' claves de examen, ' || (select count(*) from games) || ' juegos'"
