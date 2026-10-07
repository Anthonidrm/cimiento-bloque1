#!/usr/bin/env bash
# Genera los archivos para PEGAR en el SQL Editor de Supabase (sin instalar nada) a partir de supabase/migrations y supabase/seed.
#   tools/backend/empaquetar_sql.sh          genera supabase/despliegue/1_migraciones.sql y 2_semillas.sql
#   tools/backend/empaquetar_sql.sh --check  falla si lo versionado no coincide con las migraciones/semillas actuales
set -euo pipefail
cd "$(dirname "$0")/../.."
out=supabase/despliegue
[ "${1:-}" = "--check" ] && out=$(mktemp -d)
mkdir -p "$out"
{
  echo "-- CIMIENTO — TODAS las migraciones en un solo archivo. GENERADO por tools/backend/empaquetar_sql.sh (no editar a mano)."
  echo "-- Uso: Supabase → SQL Editor → pegar COMPLETO y ejecutar UNA sola vez, en un proyecto NUEVO."
  echo "-- Corre en una sola transacción: si algo falla, no queda nada a medias."
  for f in supabase/migrations/*.sql; do echo; echo "-- >>>>>>>>>> $(basename "$f")"; cat "$f"; done
} > "$out/1_migraciones.sql"
{
  echo "-- CIMIENTO — semillas (títulos de lecciones, claves del examen del maestro, juegos del versículo). GENERADO (no editar)."
  echo "-- Uso: ejecutar DESPUÉS de 1_migraciones.sql."
  for f in supabase/seed/0*.sql; do echo; echo "-- >>>>>>>>>> $(basename "$f")"; cat "$f"; done
} > "$out/2_semillas.sql"
if [ "${1:-}" = "--check" ]; then
  for f in 1_migraciones.sql 2_semillas.sql; do
    cmp -s "$out/$f" "supabase/despliegue/$f" || { echo "DESFASADO: supabase/despliegue/$f no coincide. Ejecuta tools/backend/empaquetar_sql.sh"; exit 1; }
  done
  echo "Los archivos de despliegue coinciden con las migraciones y semillas."
else
  echo "Generado: $out/1_migraciones.sql ($(wc -c < "$out/1_migraciones.sql") bytes) y $out/2_semillas.sql ($(wc -c < "$out/2_semillas.sql") bytes)"
fi
