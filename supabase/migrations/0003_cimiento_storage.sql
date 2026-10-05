-- =====================================================================================
-- CIMIENTO — migración 0003: almacenamiento PRIVADO (Supabase Storage). PROPUESTA, no aplicada.
-- Reemplaza el uso de public/ para contenido privado (guías, presentaciones, hojas, entregas, fotos).
-- Requiere el esquema `storage` de Supabase. Los buckets son privados: se leen con URL firmadas.
--
-- Convención de rutas (la usan las políticas; no cambiarla sin cambiar la política):
--   recursos : {audiencia}/{semana}/{tipo}/{ranura}/{marca-de-tiempo}-{archivo}      audiencia = maestro | estudiante | todos
--   entregas : {id-de-tarea}/{id-del-estudiante}/{marca-de-tiempo}-{archivo}
--   fotos    : {semana}/{id-de-sesión | sin-clase}/{marca-de-tiempo}-{archivo}
-- =====================================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('recursos', 'recursos', false, 52428800, array['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp','video/mp4']),
  ('entregas', 'entregas', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp']),
  ('fotos',    'fotos',    false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- ---------- recursos: Administrador y Pastor escriben; cada audiencia lee lo suyo ----------
create policy rec_read on storage.objects for select to authenticated using (
  bucket_id = 'recursos' and (
    is_staff()
    or (app_role() = 'MAESTRO'    and (storage.foldername(name))[1] in ('maestro', 'todos'))
    or (app_role() = 'ESTUDIANTE' and (storage.foldername(name))[1] in ('estudiante', 'todos'))));
create policy rec_write  on storage.objects for insert to authenticated with check (bucket_id = 'recursos' and is_staff());
create policy rec_update on storage.objects for update to authenticated using (bucket_id = 'recursos' and is_staff()) with check (bucket_id = 'recursos' and is_staff());
create policy rec_delete on storage.objects for delete to authenticated using (bucket_id = 'recursos' and is_staff());

-- ---------- entregas: el estudiante sube SOLO a su carpeta y SOLO dentro de la ventana; no edita ni borra ----------
create policy ent_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'entregas' and app_role() = 'ESTUDIANTE' and (storage.foldername(name))[2] = auth.uid()::text
  and exists (select 1 from assignments a where a.id::text = (storage.foldername(name))[1] and now() >= a.opens_at and now() < a.closes_at));
create policy ent_read on storage.objects for select to authenticated using (
  bucket_id = 'entregas' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or is_staff()
    or exists (select 1 from assignments a where a.id::text = (storage.foldername(name))[1] and is_assigned_teacher(a.week))));

-- ---------- fotos: sube el maestro, el Pastor o el Administrador; el estudiante ve solo las de su grupo ----------
create policy fot_insert on storage.objects for insert to authenticated with check (bucket_id = 'fotos' and app_role() in ('MAESTRO','PASTOR','ADMINISTRADOR'));
create policy fot_read   on storage.objects for select to authenticated using (
  bucket_id = 'fotos' and (
    is_staff() or app_role() = 'MAESTRO'
    or (app_role() = 'ESTUDIANTE' and exists (select 1 from class_photos p where p.storage_path = name))));   -- class_photos ya filtra por grupo
create policy fot_delete on storage.objects for delete to authenticated using (bucket_id = 'fotos' and is_staff());
