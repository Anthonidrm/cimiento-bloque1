-- =====================================================================================
-- CIMIENTO — migración 0006: nuevos pesos de la preparación del maestro. PROPUESTA, no aplicada.
--   Guía 45 % · Examen 25 % · Presentación 15 % · Actividades obligatorias 15 %  (suman EXACTAMENTE 100 %).
-- Antes: 50 / 30 / 20 / 0. Las actividades obligatorias dejan de pesar 0 y contribuyen al porcentaje final.
--
-- ⚠ SUPERADO por la migración 0007 en esta parte: las actividades obligatorias DEL MAESTRO son inicio y finalización de clase + pase
-- de lista (no las "actividades de la lección"). Esta migración conserva los pesos 45/25/15/15 y la regla de que sumen 100.
-- (Texto histórico:) Actividades obligatorias del maestro en una lección:
--   puntos = (actividades de la lección que el maestro registró en clase / actividades obligatorias de la lección) × 15
--   · "registró" = tiene al menos un cumplimiento (activity_completions) a su nombre para esa actividad.
--   · Si la lección NO tiene actividades obligatorias definidas, no hay nada que exigir: el componente se otorga completo (15).
--     (Decisión a confirmar: la alternativa sería 0, que limitaría la preparación a 85 % en esas lecciones.)
-- Iniciar clase sigue exigiendo solo guía completa y examen (start_class no cambia): las actividades se realizan DURANTE la clase.
-- =====================================================================================

-- ---------- Los pesos deben sumar exactamente 100 (lo exige la base de datos) ----------
create function check_prep_weights() returns trigger language plpgsql as $$
declare total numeric;
begin
  if new.key = 'prep_weights' then
    total := coalesce((new.value ->> 'guide')::numeric, 0) + coalesce((new.value ->> 'exam')::numeric, 0)
           + coalesce((new.value ->> 'presentation')::numeric, 0) + coalesce((new.value ->> 'mandatory_activities')::numeric, 0);
    if total <> 100 then raise exception 'Los pesos de preparación deben sumar exactamente 100 (suman %).', total; end if;
  end if;
  return new;
end $$;
create trigger trg_check_prep_weights before insert or update on app_config for each row execute function check_prep_weights();

update app_config
   set value = '{"guide":45,"exam":25,"presentation":15,"mandatory_activities":15}'::jsonb, updated_at = now()
 where key = 'prep_weights';

-- ---------- teacher_prep con el cuarto componente (cambia el tipo de resultado: se recrea la función y la vista que la usa) ----------
drop view v_teacher_progress;
drop function teacher_prep(uuid, int);

create function teacher_prep(p_user uuid, p_week int)
returns table (guide_pts numeric, exam_pts numeric, presentation_pts numeric, mandatory_pts numeric, total_pts numeric,
               guide_done int, exam_completed boolean, mandatory_done int, mandatory_total int)
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; secs int; mins int; slides int; scoring text; sc numeric; gd int; used int; mt int; md int;
begin
  select value into w from app_config where key = 'prep_weights';
  secs   := cfg_text('guide_sections')::int;
  mins   := cfg_text('presentation_min_seconds')::int;
  slides := cfg_text('presentation_slides')::int;
  scoring := coalesce(cfg_text('exam_scoring'), 'best');
  select count(*) into gd from guide_progress where user_id = p_user and week = p_week and completed_at is not null;
  select case scoring when 'first'  then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no asc  limit 1)
                      when 'latest' then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no desc limit 1)
                      else (select max(score_percent) from exam_attempts where user_id = p_user and week = p_week and completed_at is not null) end into sc;
  select count(*) into used from presentation_usage where user_id = p_user and week = p_week and seconds >= mins;
  select count(*) into mt from mandatory_activities where week = p_week;
  select count(distinct c.activity_id) into md from activity_completions c join mandatory_activities m on m.id = c.activity_id
   where m.week = p_week and c.teacher_id = p_user;

  guide_pts        := round((gd::numeric / secs) * (w->>'guide')::numeric, 1);
  exam_pts         := round((coalesce(sc, 0) / 100) * (w->>'exam')::numeric, 1);
  presentation_pts := round((least(used, slides)::numeric / slides) * (w->>'presentation')::numeric, 1);
  mandatory_pts    := case when mt = 0 then (w->>'mandatory_activities')::numeric
                           else round((least(md, mt)::numeric / mt) * (w->>'mandatory_activities')::numeric, 1) end;
  total_pts := guide_pts + exam_pts + presentation_pts + mandatory_pts;
  guide_done := gd;
  exam_completed := sc is not null;
  mandatory_done := least(md, mt);
  mandatory_total := mt;
  return next;
end $$;
grant execute on function teacher_prep(uuid, int) to authenticated;

create view v_teacher_progress with (security_invoker = true) as
select a.week, a.teacher_id, p.display_name as teacher_name,
       tp.guide_pts, tp.exam_pts, tp.presentation_pts, tp.mandatory_pts, tp.total_pts, tp.guide_done, tp.exam_completed,
       tp.mandatory_done, tp.mandatory_total,
       greatest((select max(updated_at) from guide_progress g where g.user_id = a.teacher_id and g.week = a.week),
                (select max(updated_at) from presentation_usage u where u.user_id = a.teacher_id and u.week = a.week),
                (select max(completed_at) from exam_attempts x where x.user_id = a.teacher_id and x.week = a.week),
                (select max(completed_at) from activity_completions c join mandatory_activities m on m.id = c.activity_id where c.teacher_id = a.teacher_id and m.week = a.week)) as last_activity,
       s.status as assignment_status, s.days_late
from teacher_assignments a
join profiles p on p.id = a.teacher_id
cross join lateral teacher_prep(a.teacher_id, a.week) tp
left join v_assignment_status s on s.week = a.week
where is_staff() or a.teacher_id = auth.uid();
grant select on v_teacher_progress to authenticated;
