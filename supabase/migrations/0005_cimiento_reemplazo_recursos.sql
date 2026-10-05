-- =====================================================================================
-- CIMIENTO — migración 0005: el Pastor (y cualquier staff) puede reemplazar recursos subidos por otro. PROPUESTA, no aplicada.
-- Defecto corregido: al insertar una versión nueva, el disparador set_current_version() marcaba la anterior como no vigente
-- con UPDATE bajo RLS; la política rv_staff exige `uploaded_by = auth.uid()`, así que si la versión anterior la subió otra
-- persona (p. ej. el Administrador), el UPDATE del Pastor fallaba y se rechazaba el reemplazo completo.
-- Solución: el disparador se ejecuta con los privilegios del dueño (SECURITY DEFINER, search_path fijo). La política de
-- INSERT sigue exigiendo staff y que la versión nueva quede a nombre de quien la sube.
-- =====================================================================================
create or replace function set_current_version() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update resource_versions set is_current = false where resource_id = new.resource_id and is_current;
  return new;
end $$;
