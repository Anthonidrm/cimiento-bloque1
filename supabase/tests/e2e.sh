#!/usr/bin/env bash
# Prueba de extremo a extremo: base de datos real + PostgREST + simuladores de Auth/Storage + app en jsdom.
# Requisitos: PostgreSQL (psql + servidor local), `postgrest` en el PATH, `npm ci`. Ejecutar desde la raíz del repo.
set -euo pipefail
cd "$(dirname "$0")/../.."
supabase/tests/harness.sh down || true
WITH_USERS=1 supabase/tests/harness.sh up
trap 'supabase/tests/harness.sh down || true' EXIT
echo "=== Integración (repositorios con permisos reales) ==="; npx tsx --tsconfig tsconfig.app.json tools/pruebas/backend.ts
supabase/tests/harness.sh down || true; WITH_USERS=1 supabase/tests/harness.sh up
echo "=== Extremo a extremo (app completa en jsdom) ==="; npx tsx --tsconfig tsconfig.app.json tools/pruebas/e2e.tsx
