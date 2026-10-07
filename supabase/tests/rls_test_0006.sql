\set ON_ERROR_STOP on
-- ===== Pesos 45/25/15/15 y actividades obligatorias dentro de la preparación =====
select t.check((select (value->>'guide')::int || '/' || (value->>'exam')::int || '/' || (value->>'presentation')::int || '/' || (value->>'mandatory_activities')::int from app_config where key = 'prep_weights') = '45/25/15/15', 'Pesos configurados: guía 45, examen 25, presentación 15, actividades obligatorias 15');
select t.check((select (value->>'guide')::numeric + (value->>'exam')::numeric + (value->>'presentation')::numeric + (value->>'mandatory_activities')::numeric from app_config where key = 'prep_weights') = 100, 'Los pesos suman EXACTAMENTE 100');
select t.check(t.fails($q$update app_config set value = '{"guide":45,"exam":25,"presentation":15,"mandatory_activities":14}' where key = 'prep_weights'$q$), 'La base de datos RECHAZA pesos que suman 99');
select t.check((select value->>'guide' from app_config where key = 'prep_weights') = '45', 'Tras los intentos fallidos los pesos siguen intactos');

-- Lección 20: sin actividades obligatorias definidas → componente completo (no hay nada que exigir)
select t.check((select mandatory_pts from teacher_prep(t.u(4), 20)) = 15 and (select mandatory_total from teacher_prep(t.u(4), 20)) = 0, 'Lección sin actividades obligatorias: se otorgan los 15 puntos (nada que exigir)');
select t.check((select total_pts from teacher_prep(t.u(4), 20)) = 15, 'Un maestro sin hacer nada en una lección sin actividades: total 15');

-- Se definen 2 actividades obligatorias para la lección 20
insert into mandatory_activities(id, week, title, created_by) values
  ('f6000000-0000-0000-0000-000000000001', 20, 'Actividad A', t.u(1)), ('f6000000-0000-0000-0000-000000000002', 20, 'Actividad B', t.u(1));
select t.check((select mandatory_pts from teacher_prep(t.u(3), 20)) = 0 and (select mandatory_total from teacher_prep(t.u(3), 20)) = 2, 'Con 2 actividades y ninguna registrada: 0 de 15');
insert into activity_completions(activity_id, student_id, teacher_id, points) values ('f6000000-0000-0000-0000-000000000001', t.u(5), t.u(3), 0);
select t.check((select mandatory_pts from teacher_prep(t.u(3), 20)) = 7.5 and (select mandatory_done from teacher_prep(t.u(3), 20)) = 1, 'Registró 1 de 2: 7,5 de 15');
insert into activity_completions(activity_id, student_id, teacher_id, points) values ('f6000000-0000-0000-0000-000000000001', t.u(6), t.u(3), 0);
select t.check((select mandatory_pts from teacher_prep(t.u(3), 20)) = 7.5, 'Registrar la MISMA actividad para más estudiantes no suma más (cuenta la actividad, no el estudiante)');
select t.check((select mandatory_pts from teacher_prep(t.u(4), 20)) = 0, 'Lo que registra un maestro no cuenta para otro');
insert into activity_completions(activity_id, student_id, teacher_id, points) values ('f6000000-0000-0000-0000-000000000002', t.u(5), t.u(3), 0);
select t.check((select mandatory_pts from teacher_prep(t.u(3), 20)) = 15 and (select mandatory_done from teacher_prep(t.u(3), 20)) = 2, 'Registró las 2: 15 de 15');

-- Todo completo = 100 % exacto
insert into guide_progress(user_id, week, section, seconds, completed_at) select t.u(3), 20, s, 30, now() from generate_series(1,23) s;
insert into exam_attempts(user_id, week, attempt_no, completed_at, score_percent) values (t.u(3), 20, 1, now(), 100);
insert into presentation_usage(user_id, week, slide, seconds) select t.u(3), 20, s, 5 from generate_series(1,9) s;
select t.check((select guide_pts || '/' || exam_pts || '/' || presentation_pts || '/' || mandatory_pts from teacher_prep(t.u(3), 20)) = '45.0/25.0/15.0/15.0', 'Todo completo: 45 + 25 + 15 + 15');
select t.check((select total_pts from teacher_prep(t.u(3), 20)) = 100, 'La preparación completa es EXACTAMENTE 100 %');

-- Vista de progreso (Administrador / Pastor / maestro) con el nuevo componente
insert into teacher_assignments(week, teacher_id, assigned_by) values (20, t.u(3), t.u(2)) on conflict (week) do update set teacher_id = excluded.teacher_id;
do $$ begin
  perform t.as_user(t.u(2));
  perform t.check((select total_pts || '/' || mandatory_pts || '/' || mandatory_done || '/' || mandatory_total from v_teacher_progress where week = 20 and teacher_id = t.u(3)) = '100.0/15.0/2/2', 'El Pastor ve en el progreso del maestro: total 100, actividades 15 (2 de 2)');
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from v_teacher_progress where week = 20) = 1, 'El maestro ve su propio progreso');
  perform t.as_user(t.u(4));
  perform t.check((select count(*) from v_teacher_progress where week = 20) = 0, 'Otro maestro NO ve ese progreso');
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from v_teacher_progress) = 0, 'El estudiante no ve progreso de maestros');
  perform t.as_user(t.u(1));
  perform t.check(t.rows($q$update app_config set value = '{"guide":40,"exam":30,"presentation":15,"mandatory_activities":15}' where key = 'prep_weights'$q$) = 1, 'El Administrador SÍ puede reajustar los pesos si siguen sumando 100');
  perform t.check(t.fails($q$update app_config set value = '{"guide":40,"exam":30,"presentation":15,"mandatory_activities":10}' where key = 'prep_weights'$q$), '…pero no si no suman 100');
  perform t.check(t.rows($q$update app_config set value = '{"guide":45,"exam":25,"presentation":15,"mandatory_activities":15}' where key = 'prep_weights'$q$) = 1, 'Se restituyen 45/25/15/15');
end $$;
