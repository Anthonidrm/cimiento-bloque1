\set ON_ERROR_STOP on
-- ===== Actividades obligatorias del maestro: INICIO Y FINALIZACIÓN DE CLASE + PASE DE LISTA (15 %) =====
insert into student_groups(id, name) values ('d7000000-0000-0000-0000-000000000001', 'Grupo 7'), ('d7000000-0000-0000-0000-000000000002', 'Grupo vacío');
insert into enrollments(student_id, group_id) values (t.u(5), 'd7000000-0000-0000-0000-000000000001'), (t.u(6), 'd7000000-0000-0000-0000-000000000001');
insert into group_teachers(group_id, teacher_id) values ('d7000000-0000-0000-0000-000000000001', t.u(3));

select t.check((select value->>'class' || '/' || (value->>'attendance') from app_config where key = 'prep_mandatory_split') = '50/50', 'Reparto por defecto de las dos actividades: 50 / 50');
select t.check(t.fails($q$update app_config set value = '{"class":60,"attendance":50}' where key = 'prep_mandatory_split'$q$), 'El reparto que no suma 100 se rechaza');

-- Sin clases: ninguna actividad hecha y NO se regalan puntos
select t.check((select class_pts || '/' || attendance_pts || '/' || mandatory_pts || '/' || mandatory_done || '/' || mandatory_total from teacher_prep(t.u(3), 21)) = '0/0/0/0/2', 'Sin clases dadas: 0 de 15 (hay 2 actividades obligatorias; nada se regala)');

-- 1) Inicio y finalización: si la hizo el Administrador/Pastor como excepción, el maestro NO recibe el crédito
insert into class_sessions(week, group_id, teacher_id, started_by, started_at, ended_at, ended_by, status)
  values (21, 'd7000000-0000-0000-0000-000000000001', t.u(3), t.u(1), now() - interval '2 hours', now() - interval '1 hour', t.u(2), 'FINALIZADA');
select t.check(not (select class_done from teacher_prep(t.u(3), 21)), 'Clase iniciada y finalizada por Admin/Pastor: el maestro no recibe el crédito');
insert into class_sessions(week, group_id, teacher_id, started_by, started_at, ended_at, ended_by, status)
  values (21, 'd7000000-0000-0000-0000-000000000001', t.u(3), t.u(3), now() - interval '1 hour', now(), t.u(1), 'FINALIZADA');
select t.check(not (select class_done from teacher_prep(t.u(3), 21)), 'La inició el maestro pero la finalizó otra persona: no cuenta');
insert into class_sessions(id, week, group_id, teacher_id, started_by, started_at, ended_at, ended_by, status)
  values ('c7000000-0000-0000-0000-000000000001', 21, 'd7000000-0000-0000-0000-000000000001', t.u(3), t.u(3), now() - interval '30 minutes', now(), t.u(3), 'FINALIZADA');
select t.check((select class_done and class_pts = 7.5 and mandatory_pts = 7.5 and mandatory_done = 1 from teacher_prep(t.u(3), 21)), 'La inició y la finalizó el propio maestro: 7,5 de 15');
select t.check(not (select class_done from teacher_prep(t.u(4), 21)), 'Lo que hace un maestro no cuenta para otro');

-- 2) Pase de lista: todos los de la lista de la clase, registrado por el maestro
select t.check(not (select attendance_done from teacher_prep(t.u(3), 21)), 'Sin asistencia registrada: el pase de lista no cuenta');
insert into attendance(session_id, student_id, status, recorded_by) values ('c7000000-0000-0000-0000-000000000001', t.u(5), 'PRESENTE', t.u(3));
select t.check(not (select attendance_done from teacher_prep(t.u(3), 21)), 'Solo 1 de 2 estudiantes marcados: no cuenta');
insert into attendance(session_id, student_id, status, recorded_by) values ('c7000000-0000-0000-0000-000000000001', t.u(6), 'EXCUSA', t.u(3));
select t.check((select attendance_done and attendance_pts = 7.5 and mandatory_pts = 15 and mandatory_done = 2 from teacher_prep(t.u(3), 21)), 'Todos marcados (presente, ausente o excusa): 7,5 más, 15 de 15 en total');

-- Asistencia registrada por otra persona no es el pase de lista del maestro
insert into class_sessions(id, week, group_id, teacher_id, started_by, started_at, ended_at, ended_by, status)
  values ('c7000000-0000-0000-0000-000000000002', 22, 'd7000000-0000-0000-0000-000000000001', t.u(3), t.u(3), now() - interval '30 minutes', now(), t.u(3), 'FINALIZADA');
insert into attendance(session_id, student_id, status, recorded_by) values ('c7000000-0000-0000-0000-000000000002', t.u(5), 'PRESENTE', t.u(2)), ('c7000000-0000-0000-0000-000000000002', t.u(6), 'PRESENTE', t.u(2));
select t.check((select class_done and not attendance_done and mandatory_pts = 7.5 from teacher_prep(t.u(3), 22)), 'Asistencia registrada por el Pastor: no es el pase de lista del maestro (solo cuenta la clase)');

-- Lista vacía: no se puede evidenciar
insert into class_sessions(id, week, group_id, teacher_id, started_by, started_at, ended_at, ended_by, status)
  values ('c7000000-0000-0000-0000-000000000003', 23, 'd7000000-0000-0000-0000-000000000002', t.u(3), t.u(3), now() - interval '30 minutes', now(), t.u(3), 'FINALIZADA');
select t.check((select class_done and not attendance_done from teacher_prep(t.u(3), 23)), 'Grupo sin estudiantes: el pase de lista no puede evidenciarse (no cuenta)');

-- Sin grupo en la sesión: la lista son los estudiantes de los grupos que el maestro enseña
insert into class_sessions(id, week, group_id, teacher_id, started_by, started_at, ended_at, ended_by, status)
  values ('c7000000-0000-0000-0000-000000000004', 26, null, t.u(3), t.u(3), now() - interval '30 minutes', now(), t.u(3), 'FINALIZADA');
insert into attendance(session_id, student_id, status, recorded_by) values ('c7000000-0000-0000-0000-000000000004', t.u(5), 'PRESENTE', t.u(3)), ('c7000000-0000-0000-0000-000000000004', t.u(6), 'AUSENTE', t.u(3));
select t.check((select attendance_done from teacher_prep(t.u(3), 26)), 'Clase sin grupo: la lista son los estudiantes de los grupos del maestro');

-- Con las funciones reales: quién inicia / finaliza queda estampado, y la excepción del Pastor no da crédito
insert into teacher_assignments(week, teacher_id, assigned_by) values (24, t.u(3), t.u(2)), (25, t.u(3), t.u(2));
insert into guide_progress(user_id, week, section, seconds, completed_at) select t.u(3), w, s, 30, now() from generate_series(1,23) s, (values (24),(25)) v(w);
insert into exam_attempts(user_id, week, attempt_no, completed_at, score_percent) values (t.u(3), 24, 1, now(), 100), (t.u(3), 25, 1, now(), 100);
insert into presentation_usage(user_id, week, slide, seconds) select t.u(3), 24, s, 5 from generate_series(1,9) s;
do $$ declare sid uuid; sid2 uuid; begin
  perform t.as_user(t.u(3));
  sid := start_class(24, 'd7000000-0000-0000-0000-000000000001');
  insert into attendance(session_id, student_id, status, recorded_by) values (sid, t.u(5), 'PRESENTE', t.u(3)), (sid, t.u(6), 'AUSENTE', t.u(3));
  perform end_class(sid);
  perform t.check((select started_by = t.u(3) and ended_by = t.u(3) from class_sessions where id = sid), 'El servidor estampa quién inició y quién finalizó la clase (el maestro)');
  perform t.check((select class_done and attendance_done and mandatory_pts = 15 from teacher_prep(t.u(3), 24)), 'Flujo real del maestro: inicia, pasa lista y finaliza = 15 de 15');
  perform t.check((select total_pts = 100 and guide_pts = 45 and exam_pts = 25 and presentation_pts = 15 from teacher_prep(t.u(3), 24)), 'Con guía, examen, presentación y las 2 actividades: EXACTAMENTE 100 %');
  perform t.as_user(t.u(2));
  sid2 := start_class(25, 'd7000000-0000-0000-0000-000000000001');
  perform end_class(sid2);
  perform t.check((select started_by = t.u(2) and ended_by = t.u(2) from class_sessions where id = sid2), 'Si el Pastor inicia y finaliza como excepción queda estampado a su nombre');
  perform t.check(not (select class_done from teacher_prep(t.u(3), 25)), '…y el maestro asignado no recibe el crédito de esa clase');
  perform t.as_user(t.u(2));
  perform t.check((select total_pts || '/' || mandatory_pts || '/' || class_done || '/' || attendance_done || '/' || mandatory_done from v_teacher_progress where week = 24 and teacher_id = t.u(3)) = '100.0/15.0/true/true/2', 'El Pastor ve en el progreso del maestro: 100 %, actividades 15, clase ✓, lista ✓');
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from v_teacher_progress where week = 24) = 1, 'El maestro ve su propio progreso');
  perform t.as_user(t.u(4));
  perform t.check((select count(*) from v_teacher_progress where week = 24) = 0, 'Otro maestro NO ve ese progreso');
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from v_teacher_progress) = 0, 'El estudiante no ve progreso de maestros');
end $$;

-- Las actividades de INTEGRACIÓN y las de la lección NO cuentan para el 15 %
insert into integration_activities(week, title, points) values (27, 'Integración de prueba', 5) on conflict (week) do nothing;
insert into mandatory_activities(id, week, title, created_by) values ('f7000000-0000-0000-0000-000000000001', 27, 'Actividad de la lección', t.u(1));
insert into activity_completions(activity_id, student_id, teacher_id, points) values ('f7000000-0000-0000-0000-000000000001', t.u(5), t.u(3), 0);
insert into integration_assignments(week, student_id, assigned_by) values (27, t.u(5), t.u(3)) on conflict do nothing;
select t.check((select mandatory_pts || '/' || mandatory_done from teacher_prep(t.u(3), 27)) = '0/0', 'Actividades de integración y de la lección NO suman al 15 % del maestro');
