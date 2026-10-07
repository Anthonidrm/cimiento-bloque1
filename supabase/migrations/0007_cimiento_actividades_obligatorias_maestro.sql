-- =====================================================================================
-- CIMIENTO — migración 0007: actividades obligatorias DEL MAESTRO (15 % de su preparación). PROPUESTA, no aplicada.
-- CORRIGE el criterio de la 0006. Las actividades obligatorias del maestro son DOS (definidas por el propietario):
--     1. INICIO Y FINALIZACIÓN DE CLASE
--     2. PASE DE LISTA
-- Peso total 15 %, repartido por defecto 7,5 + 7,5 (app_config.prep_mandatory_split, suma 100).
-- NO forman parte de este 15 % las actividades de los estudiantes: ni las "actividades de la lección"
-- (mandatory_activities / activity_completions) ni las ACTIVIDADES DE INTEGRACIÓN (integration_*, coronas), que siguen siendo
-- módulos independientes y no se modifican.
--
-- Criterios (decisiones a confirmar):
--  · Inicio y finalización de clase: cuenta en una lección cuando el MAESTRO ASIGNADO inició la clase él mismo (started_by) y la
--    finalizó él mismo (ended_by, nuevo). Si la inicia o finaliza el Administrador/Pastor como excepción, el maestro no recibe el crédito.
--  · Pase de lista: cuenta cuando el maestro registró asistencia (Presente / Ausente / Excusa) de TODOS los estudiantes de la
--    lista de esa clase (los del grupo de la sesión; sin grupo, los de los grupos que él enseña). Una lista vacía no se puede evidenciar: no cuenta.
-- =====================================================================================

-- ---------- Quién finalizó la clase (sin tocar end_class: lo estampa un disparador) ----------
alter table class_sessions add column ended_by uuid references profiles(id);
create function stamp_session_end() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.ended_at is null and new.ended_at is not null and new.ended_by is null then new.ended_by := auth.uid(); end if;
  return new;
end $$;
create trigger trg_stamp_session_end before update on class_sessions for each row execute function stamp_session_end();

-- ---------- Reparto entre las dos actividades (debe sumar 100) ----------
insert into app_config(key, value, note) values ('prep_mandatory_split', '{"class":50,"attendance":50}', 'Reparto del peso de las actividades obligatorias del maestro: inicio y finalización de clase / pase de lista (suma 100)')
on conflict (key) do nothing;

create or replace function check_prep_weights() returns trigger language plpgsql as $$
declare total numeric;
begin
  if new.key = 'prep_weights' then
    total := coalesce((new.value ->> 'guide')::numeric, 0) + coalesce((new.value ->> 'exam')::numeric, 0)
           + coalesce((new.value ->> 'presentation')::numeric, 0) + coalesce((new.value ->> 'mandatory_activities')::numeric, 0);
    if total <> 100 then raise exception 'Los pesos de preparación deben sumar exactamente 100 (suman %).', total; end if;
  elsif new.key = 'prep_mandatory_split' then
    total := coalesce((new.value ->> 'class')::numeric, 0) + coalesce((new.value ->> 'attendance')::numeric, 0);
    if total <> 100 then raise exception 'El reparto de las actividades obligatorias debe sumar 100 (suma %).', total; end if;
  end if;
  return new;
end $$;

-- ---------- teacher_prep: el cuarto componente ahora es inicio/fin de clase + pase de lista ----------
drop view v_teacher_progress;
drop function teacher_prep(uuid, int);

create function teacher_prep(p_user uuid, p_week int)
returns table (guide_pts numeric, exam_pts numeric, presentation_pts numeric, class_pts numeric, attendance_pts numeric, mandatory_pts numeric, total_pts numeric,
               guide_done int, exam_completed boolean, class_done boolean, attendance_done boolean, mandatory_done int, mandatory_total int)
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; sp jsonb; secs int; mins int; slides int; scoring text; sc numeric; gd int; used int; ses record; roster int; marked int;
begin
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
grant execute on function teacher_prep(uuid, int) to authenticated;

create view v_teacher_progress with (security_invoker = true) as
select a.week, a.teacher_id, p.display_name as teacher_name,
       tp.guide_pts, tp.exam_pts, tp.presentation_pts, tp.class_pts, tp.attendance_pts, tp.mandatory_pts, tp.total_pts,
       tp.guide_done, tp.exam_completed, tp.class_done, tp.attendance_done, tp.mandatory_done, tp.mandatory_total,
       greatest((select max(updated_at) from guide_progress g where g.user_id = a.teacher_id and g.week = a.week),
                (select max(updated_at) from presentation_usage u where u.user_id = a.teacher_id and u.week = a.week),
                (select max(completed_at) from exam_attempts x where x.user_id = a.teacher_id and x.week = a.week),
                (select max(coalesce(ended_at, started_at)) from class_sessions c where c.teacher_id = a.teacher_id and c.week = a.week)) as last_activity,
       s.status as assignment_status, s.days_late
from teacher_assignments a
join profiles p on p.id = a.teacher_id
cross join lateral teacher_prep(a.teacher_id, a.week) tp
left join v_assignment_status s on s.week = a.week
where is_staff() or a.teacher_id = auth.uid();
grant select on v_teacher_progress to authenticated;
