-- =====================================================================================
-- CIMIENTO — migración 0004: primer acceso, historial de cambios y tareas programadas. PROPUESTA, no aplicada.
-- Solo CREA objetos nuevos.
-- =====================================================================================

-- ---------- Primer acceso: el usuario define su contraseña (Supabase Auth) y marca que ya lo hizo ----------
-- El cliente cambia la contraseña con supabase.auth.updateUser({ password }) y llama a esta función.
-- Solo puede tocar SU propia marca; no puede cambiar rol ni estado.
create function complete_first_access() returns void language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid() and active
$$;
revoke execute on function complete_first_access() from public, anon;
grant  execute on function complete_first_access() to authenticated;

-- ---------- Historial de cambios (quién cambió qué y cuándo) ----------
create table change_log (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_key    text,
  action     text not null,                 -- INSERT | UPDATE | DELETE | ADMIN_USERS_*
  old_data   jsonb,
  new_data   jsonb,
  done_by    uuid,                          -- NULL cuando lo hace un proceso del servidor
  done_at    timestamptz not null default now()
);
create index on change_log(table_name, done_at desc);
alter table change_log enable row level security;
create policy changelog_read on change_log for select to authenticated using (is_staff());   -- Admin y Pastor leen; nadie escribe a mano
grant select on change_log to authenticated;

create function log_change() returns trigger language plpgsql security definer set search_path = public as $$
declare o jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end; n jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
begin
  insert into change_log(table_name, row_key, action, old_data, new_data, done_by)
  values (tg_table_name, coalesce(n ->> 'id', n ->> 'week', o ->> 'id', o ->> 'week'), tg_op, o, n, auth.uid());
  return null;
end $$;
create trigger log_profiles            after insert or update or delete on profiles             for each row execute function log_change();
create trigger log_resources           after insert or update or delete on resources            for each row execute function log_change();
create trigger log_resource_versions   after insert or update or delete on resource_versions    for each row execute function log_change();
create trigger log_assignments         after insert or update or delete on assignments          for each row execute function log_change();
create trigger log_mandatory           after insert or update or delete on mandatory_activities for each row execute function log_change();
create trigger log_integration         after insert or update or delete on integration_activities for each row execute function log_change();
create trigger log_app_config          after insert or update or delete on app_config           for each row execute function log_change();

-- ---------- Tareas programadas (alertas de asignación y recordatorios) ----------
-- En Supabase real se activan con la extensión pg_cron (Database → Extensions). Se deja comentado porque en una base
-- sin pg_cron fallaría; ejecutar manualmente en el SQL Editor cuando exista el proyecto:
--   select cron.schedule('cimiento-alertas-asignacion', '*/30 * * * *', $$ select generate_assignment_alerts() $$);
--   select cron.schedule('cimiento-recordatorios',      '0 13 * * *',   $$ select generate_reminders() $$);
