#!/usr/bin/env bash
# Prueba de extremo a extremo: base de datos real + PostgREST + simuladores de Auth/Storage + app en jsdom.
# Requisitos: PostgreSQL (psql + servidor local), `postgrest` en el PATH, `npm ci`. Ejecutar desde la raíz del repo.
set -euo pipefail
cd "$(dirname "$0")/../.."
supabase/tests/harness.sh down || true
WITH_USERS=1 supabase/tests/harness.sh up
trap 'supabase/tests/harness.sh down || true' EXIT
echo "=== Archivos de despliegue y semillas al día ==="
tools/backend/empaquetar_sql.sh --check
npx tsx --tsconfig tsconfig.app.json tools/backend/exportar_semillas.ts > /dev/null
git diff --quiet -- supabase/seed || { echo "SEMILLAS DESFASADAS respecto a los datos de la app: ejecuta tools/backend/exportar_semillas.ts y tools/backend/empaquetar_sql.sh"; exit 1; }
echo "Semillas coinciden con los datos de la app."
echo "=== Integración (repositorios con permisos reales) ==="; npx tsx --tsconfig tsconfig.app.json tools/pruebas/backend.ts
supabase/tests/harness.sh down || true; WITH_USERS=1 supabase/tests/harness.sh up
echo "=== Extremo a extremo (app completa en jsdom) ==="; NODE_OPTIONS="--import ./tools/pruebas/register.mjs" npx tsx --tsconfig tsconfig.app.json tools/pruebas/e2e.tsx
supabase/tests/harness.sh down || true; WITH_USERS=1 supabase/tests/harness.sh up
echo "=== Función de servidor admin-users (su código real contra PostgreSQL) ==="; NODE_OPTIONS="--import ./tools/pruebas/register.mjs" npx tsx --tsconfig tsconfig.app.json tools/pruebas/edge.ts
