-- =====================================================================================
-- CIMIENTO — migración 0008: endurecimiento de permisos y diagnóstico. PROPUESTA, no aplicada.
-- En Supabase real, todo objeto nuevo de `public` recibe permisos automáticos para anon y authenticated, y las funciones son
-- ejecutables por PUBLIC. Esta migración cierra lo que no debe quedar abierto:
--  1. `anon` (visitante sin sesión) no accede a NADA de public: ni tablas, ni vistas, ni funciones, ni secuencias (tampoco a futuro).
--  2. Funciones INTERNAS solo para el servidor (disparadores, cron, otras funciones): notify, recompute_lesson_score,
--     generate_assignment_alerts, generate_reminders. Ningún usuario las ejecuta por RPC (antes cualquiera podía mandar
--     notificaciones a cualquier usuario o recalcular puntuaciones).
--  3. teacher_prep(usuario, semana): un usuario solo ve SU preparación (antes cualquiera veía la de cualquier maestro).
--  4. cimiento_health(): diagnóstico para el Administrador (esquema, permisos, semillas, almacenamiento, usuarios).
-- =====================================================================================

-- ---------- 1. anon: sin acceso a public ----------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
-- PUBLIC recibe EXECUTE por defecto en toda función nueva; solo la orden SIN `in schema` lo revoca para el rol que crea los objetos.
alter default privileges for role postgres revoke execute on functions from public;

-- ---------- 2. funciones internas: solo el servidor ----------
revoke execute on function notify(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function recompute_lesson_score(uuid, int)     from public, anon, authenticated;
revoke execute on function generate_assignment_alerts()          from public, anon, authenticated;
revoke execute on function generate_reminders()                  from public, anon, authenticated;

-- ---------- 3. teacher_prep con control de quién consulta ----------
create or replace function teacher_prep(p_user uuid, p_week int)
returns table (guide_pts numeric, exam_pts numeric, presentation_pts numeric, class_pts numeric, attendance_pts numeric, mandatory_pts numeric, total_pts numeric,
               guide_done int, exam_completed boolean, class_done boolean, attendance_done boolean, mandatory_done int, mandatory_total int)
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; sp jsonb; secs int; mins int; slides int; scoring text; sc numeric; gd int; used int; ses record; roster int; marked int;
begin
  -- Un usuario solo puede consultar su propia preparación; el Administrador y el Pastor, la de cualquiera.
  -- (auth.uid() es nulo solo en contextos del servidor: service_role, cron, migraciones; anon ya no tiene EXECUTE.)
  if auth.uid() is not null and p_user is distinct from auth.uid() and not is_staff() then return; end if;
  select value into w  from app_config where key = 'prep_weights';
  select value into sp from app_config where key = 'prep_mandatory_split';
  secs   := cfg_text('guide_sections')::int;
  mins   := cfg_text('presentation_min_seconds')::int;
  slides := cfg_text('presentation_slides')::int;
  scoring := coalesce(cfg_text('exam_scoring'), 'best');
  select count(*) into gd from guide_progress where user_id = p_user and week = p_week and completed_at is not null;
  select case scoring when 'first'  then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no asc  limit 1)
                      when 'latest' then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no desc limit 1)
                      else (select max(score_percent) from exam_attempts where user_id = p_user and week = p_week and completed_at is not null) end into sc;
  select count(*) into used from presentation_usage where user_id = p_user and week = p_week and seconds >= mins;

  -- Actividad obligatoria 1: inicio y finalización de clase hechos por el propio maestro
  class_done := exists (select 1 from class_sessions s where s.week = p_week and s.teacher_id = p_user
                         and s.started_by = p_user and s.ended_by = p_user and s.status = 'FINALIZADA');

  -- Actividad obligatoria 2: pase de lista completo (todos los de la lista de la clase, registrado por el maestro)
  attendance_done := false;
  for ses in select id, group_id from class_sessions where week = p_week and teacher_id = p_user loop
    with r as (select distinct e.student_id from enrollments e
                where (ses.group_id is not null and e.group_id = ses.group_id)
                   or (ses.group_id is null and e.group_id in (select gt.group_id from group_teachers gt where gt.teacher_id = p_user)))
    select (select count(*) from r),
           (select count(distinct a.student_id) from attendance a where a.session_id = ses.id and a.recorded_by = p_user and a.student_id in (select student_id from r))
      into roster, marked;
    if roster > 0 and marked >= roster then attendance_done := true; exit; end if;
  end loop;

  guide_pts        := round((gd::numeric / secs) * (w->>'guide')::numeric, 1);
  exam_pts         := round((coalesce(sc, 0) / 100) * (w->>'exam')::numeric, 1);
  presentation_pts := round((least(used, slides)::numeric / slides) * (w->>'presentation')::numeric, 1);
  class_pts        := case when class_done      then round((w->>'mandatory_activities')::numeric * (sp->>'class')::numeric      / 100, 1) else 0 end;
  attendance_pts   := case when attendance_done then round((w->>'mandatory_activities')::numeric * (sp->>'attendance')::numeric / 100, 1) else 0 end;
  mandatory_pts    := class_pts + attendance_pts;
  total_pts        := guide_pts + exam_pts + presentation_pts + mandatory_pts;
  guide_done := gd;
  exam_completed := sc is not null;
  mandatory_done  := (class_done::int) + (attendance_done::int);
  mandatory_total := 2;
  return next;
end $$;

-- ---------- 4. Diagnóstico para el Administrador ----------
create function cimiento_health() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb := '[]'::jsonb; n int := 0; m int := 0; w jsonb; sp jsonb; sum_w numeric; sum_s numeric; has_cron boolean; ok_all boolean;
begin
  if app_role() is distinct from 'ADMINISTRADOR' then raise exception 'Solo el Administrador puede ver el diagnóstico.'; end if;

  select count(*) into n from pg_tables where schemaname = 'public' and not rowsecurity;
  r := r || jsonb_build_object('name', 'Permisos por fila (RLS) activos en todas las tablas', 'required', true, 'ok', n = 0, 'detail', case when n = 0 then 'todas protegidas' else n || ' tabla(s) sin RLS' end);

  r := r || jsonb_build_object('name', 'Migraciones 0001–0002: tablas base', 'required', true,
    'ok', to_regclass('public.profiles') is not null and to_regclass('public.class_sessions') is not null and to_regclass('public.attendance') is not null
          and to_regclass('public.exam_questions') is not null and to_regclass('public.group_teachers') is not null and to_regclass('public.notification_deliveries') is not null,
    'detail', 'perfiles, clases, asistencia, preguntas de examen, grupos, cola de correo');

  select count(*) into n from storage.buckets where id in ('recursos', 'entregas', 'fotos') and not public;
  r := r || jsonb_build_object('name', 'Migración 0003: almacenamiento privado (recursos, entregas, fotos)', 'required', true, 'ok', n = 3, 'detail', n || ' de 3 buckets privados');

  r := r || jsonb_build_object('name', 'Migración 0004: historial de cambios y primer acceso', 'required', true,
    'ok', to_regclass('public.change_log') is not null and exists (select 1 from pg_proc where proname = 'complete_first_access'), 'detail', 'change_log y complete_first_access');

  select value into w from app_config where key = 'prep_weights';
  select value into sp from app_config where key = 'prep_mandatory_split';
  sum_w := coalesce((w->>'guide')::numeric, 0) + coalesce((w->>'exam')::numeric, 0) + coalesce((w->>'presentation')::numeric, 0) + coalesce((w->>'mandatory_activities')::numeric, 0);
  sum_s := coalesce((sp->>'class')::numeric, 0) + coalesce((sp->>'attendance')::numeric, 0);
  r := r || jsonb_build_object('name', 'Migraciones 0006–0007: evaluación del maestro suma 100 %', 'required', true,
    'ok', sum_w = 100 and sum_s = 100 and exists (select 1 from information_schema.columns where table_name = 'class_sessions' and column_name = 'ended_by'),
    'detail', 'guía ' || coalesce(w->>'guide', '?') || ' · examen ' || coalesce(w->>'exam', '?') || ' · presentación ' || coalesce(w->>'presentation', '?') || ' · actividades ' || coalesce(w->>'mandatory_activities', '?') || ' (suma ' || sum_w || '); clase/lista ' || coalesce(sp->>'class', '?') || '/' || coalesce(sp->>'attendance', '?'));

  select count(*) into n from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public';
  select count(*) into m from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute');
  r := r || jsonb_build_object('name', 'Migración 0008: visitantes sin sesión (anon) sin acceso', 'required', true, 'ok', n = 0 and m = 0, 'detail', n || ' permisos de tabla y ' || m || ' funciones expuestas a anon');

  select count(*) into n from lessons; select count(*) into m from lessons where developed;
  r := r || jsonb_build_object('name', 'Semillas: 52 lecciones', 'required', true, 'ok', n = 52 and m >= 1, 'detail', n || ' lecciones, ' || m || ' desarrolladas');
  select count(*) into n from exam_questions;
  r := r || jsonb_build_object('name', 'Semillas: claves del examen del maestro', 'required', true, 'ok', n >= 1, 'detail', n || ' preguntas con su clave en el servidor');
  select count(*) into n from games;
  r := r || jsonb_build_object('name', 'Semillas: juegos del versículo', 'required', false, 'ok', n >= 1, 'detail', n || ' juegos');

  select count(*) into n from profiles where role = 'ADMINISTRADOR' and active;
  r := r || jsonb_build_object('name', 'Hay al menos un Administrador activo', 'required', true, 'ok', n >= 1, 'detail', n || ' administrador(es)');
  r := r || jsonb_build_object('name', 'Usuarios por rol', 'required', false, 'ok', true,
    'detail', coalesce((select string_agg(role || ': ' || c, ' · ' order by role) from (select role::text, count(*) c from profiles where active group by role) x), 'ninguno'));

  r := r || jsonb_build_object('name', 'Destinos de los informes de clase configurados', 'required', false, 'ok', exists (select 1 from app_config where key = 'report_recipients'),
    'detail', case when exists (select 1 from app_config where key = 'report_recipients') then 'configurados (el envío real además requiere proveedor de correo y la función send-deliveries)' else 'sin configurar: los informes quedan en cola (no se envían)' end);
  select count(*) into n from notification_deliveries where status = 'PENDIENTE';
  r := r || jsonb_build_object('name', 'Correos en cola sin enviar', 'required', false, 'ok', true, 'detail', n || ' pendiente(s)');

  has_cron := to_regclass('cron.job') is not null;
  n := 0;
  if has_cron then execute 'select count(*) from cron.job where jobname like ''cimiento-%''' into n; end if;
  r := r || jsonb_build_object('name', 'Tareas programadas (pg_cron) de alertas y recordatorios', 'required', false, 'ok', has_cron and n >= 1,
    'detail', case when not has_cron then 'pg_cron no está activado' when n = 0 then 'pg_cron activo pero sin las tareas de CIMIENTO' else n || ' tarea(s)' end);

  select coalesce(bool_and((c ->> 'ok')::boolean) filter (where (c ->> 'required')::boolean), true) into ok_all from jsonb_array_elements(r) c;
  return jsonb_build_object('ok', ok_all, 'checks', r, 'at', now());
end $$;
revoke execute on function cimiento_health() from public, anon;
grant  execute on function cimiento_health() to authenticated;
