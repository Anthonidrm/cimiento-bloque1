\set ON_ERROR_STOP on
create schema t;
create table t.results(ok boolean, msg text);
create function t.check(c boolean, msg text) returns void language plpgsql as $$ begin insert into t.results values (coalesce(c,false), msg); end $$;
create function t.as_user(u uuid) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u::text, true); execute 'set local role authenticated'; end $$;
create function t.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
create function t.rows(q text) returns int language plpgsql as $$ declare n int; begin execute q; get diagnostics n = row_count; return n; end $$;
grant usage on schema t to authenticated, anon;
grant all on all tables in schema t to authenticated, anon;
grant execute on all functions in schema t to authenticated, anon;

-- ---------- Datos de prueba (como superusuario) ----------
insert into auth.users(id, email) values
 ('a0000000-0000-0000-0000-000000000001','admin@t'), ('a0000000-0000-0000-0000-000000000002','pastor@t'),
 ('a0000000-0000-0000-0000-000000000003','lela@t'),  ('a0000000-0000-0000-0000-000000000004','tefa@t'),
 ('a0000000-0000-0000-0000-000000000005','est1@t'),  ('a0000000-0000-0000-0000-000000000006','est2@t');
insert into profiles(id, username, display_name, role) values
 ('a0000000-0000-0000-0000-000000000001','admin','Admin','ADMINISTRADOR'), ('a0000000-0000-0000-0000-000000000002','pastor','Pastor','PASTOR'),
 ('a0000000-0000-0000-0000-000000000003','lela','Lela','MAESTRO'),         ('a0000000-0000-0000-0000-000000000004','tefa','Tefa','MAESTRO'),
 ('a0000000-0000-0000-0000-000000000005','est1','Estudiante 1','ESTUDIANTE'), ('a0000000-0000-0000-0000-000000000006','est2','Estudiante 2','ESTUDIANTE');
insert into student_groups(id, name) values ('d0000000-0000-0000-0000-000000000001', 'Grupo A');
insert into enrollments(student_id, group_id) values ('a0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000001'), ('a0000000-0000-0000-0000-000000000006','d0000000-0000-0000-0000-000000000001');
insert into group_teachers(group_id, teacher_id) values ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003');
insert into teacher_assignments(week, teacher_id, assigned_by) values (1, 'a0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid);

-- 1. Perfiles y roles
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid);
  perform t.check((select count(*) from profiles) = 1, 'Estudiante: solo ve su propio perfil');
  perform t.check(t.rows(format('update profiles set role = ''ADMINISTRADOR'' where id = %L', 'a0000000-0000-0000-0000-000000000005'::uuid)) = 0, 'Estudiante NO puede cambiarse el rol');
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
  perform t.check((select count(*) from profiles where role = 'ESTUDIANTE') = 2, 'Maestro ve a SUS estudiantes');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);
  perform t.check((select count(*) from profiles where role = 'ESTUDIANTE') = 0, 'Un maestro sin grupo NO ve estudiantes ajenos');
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid);
  perform t.check(t.rows(format('update profiles set active = false where id = %L', 'a0000000-0000-0000-0000-000000000005'::uuid)) = 0, 'Pastor NO puede desactivar usuarios');
  perform t.check(t.fails(format('insert into profiles(id,username,display_name,role) values (gen_random_uuid(),''x'',''x'',''MAESTRO'')')), 'Pastor NO puede crear usuarios');
  perform t.check((select count(*) from profiles) = 6, 'Pastor puede LEER usuarios (para asignar maestros)');
  perform t.as_user('a0000000-0000-0000-0000-000000000001'::uuid);
  perform t.check(t.rows(format('update profiles set active = false where id = %L', 'a0000000-0000-0000-0000-000000000006'::uuid)) = 1, 'Administrador SÍ activa/desactiva usuarios');
  perform t.check(t.rows(format('update profiles set role = ''MAESTRO'' where id = %L', 'a0000000-0000-0000-0000-000000000006'::uuid)) = 1, 'Administrador SÍ cambia roles');
end $$;
update profiles set active = true, role = 'ESTUDIANTE' where id = 'a0000000-0000-0000-0000-000000000006';

-- 2. Anónimo sin acceso
do $$ begin
  execute 'set local role anon';
  perform t.check(t.fails('select * from profiles'), 'Anónimo: sin acceso a las tablas');
end $$;

-- 3. Asignación de maestros
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid);
  perform t.check(t.rows(format('insert into teacher_assignments(week,teacher_id,assigned_by) values (2,%L,%L)', 'a0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid)) = 1, 'Pastor asigna maestro a la semana 2');
  perform t.check(t.rows(format('update teacher_assignments set teacher_id = %L where week = 2', 'a0000000-0000-0000-0000-000000000003'::uuid)) = 1, 'Pastor cambia el maestro');
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
  perform t.check(t.fails(format('insert into teacher_assignments(week,teacher_id,assigned_by) values (3,%L,%L)', 'a0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid)), 'Maestro NO puede asignarse lecciones');
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid);
  perform t.check((select count(*) from teacher_assignments) = 2, 'Estudiante ve el maestro asignado de cada lección');
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid);
  perform t.check(t.rows('delete from teacher_assignments where week = 2') = 1, 'Pastor quita el maestro');
end $$;
select t.check((select count(*) from teacher_assignment_history where week = 2) = 3, 'Historial: ASIGNADO, CAMBIADO y QUITADO quedan registrados');

-- 4. Preparación: cada quien lo suyo
insert into guide_progress(user_id, week, section, seconds, completed_at) select 'a0000000-0000-0000-0000-000000000003', 1, s, 30, now() from generate_series(1,12) s;
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);   perform t.check((select count(*) from guide_progress) = 12, 'Maestro ve su propio progreso de guía');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);   perform t.check((select count(*) from guide_progress) = 0, 'Otro maestro NO ve el progreso ajeno');
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid);   perform t.check((select count(*) from guide_progress) = 0, 'Estudiante NO ve preparación de maestros');
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid); perform t.check((select count(*) from guide_progress) = 12, 'Pastor ve el progreso de los maestros');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);   perform t.check(t.fails(format('insert into guide_progress(user_id,week,section,seconds) values (%L,1,1,5)', 'a0000000-0000-0000-0000-000000000003'::uuid)), 'Nadie escribe progreso a nombre de otro');
end $$;

-- 5. Examen: las respuestas las escribe SOLO el servidor y son inmutables
insert into exam_attempts(id,user_id,week,attempt_no) values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 1, 1);
insert into exam_answers(attempt_id,question_id,selected_option,is_correct) values ('b0000000-0000-0000-0000-000000000001','s1-q1','a',false);
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
  perform t.check(t.fails('insert into exam_answers(attempt_id,question_id,selected_option,is_correct) values (''b0000000-0000-0000-0000-000000000001'',''s1-q2'',''a'',true)'), 'El maestro NO inserta respuestas directamente (no puede marcarse "correcto")');
  perform t.check(t.fails('insert into exam_attempts(user_id,week,attempt_no) values (''a0000000-0000-0000-0000-000000000003'',2,1)'), 'El maestro NO crea intentos directamente');
  perform t.check(t.rows('update exam_answers set selected_option = ''b'', is_correct = true') = 0, 'El maestro NO puede cambiar su respuesta registrada');
  perform t.check(t.rows('delete from exam_answers') = 0, 'El maestro NO puede borrarla');
  perform t.check((select count(*) from exam_answers) = 1, 'Pero sí puede LEER sus respuestas');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);
  perform t.check((select count(*) from exam_answers) = 0, 'Otro maestro NO ve las respuestas ajenas');
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid);
  perform t.check((select count(*) from exam_answers) = 1, 'Pastor puede revisar las respuestas');
end $$;
select t.check(t.fails('update exam_answers set is_correct = true'), 'Disparador: ni con privilegios altos se modifica una respuesta');
select t.check((select selected_option from exam_answers) = 'a' and not (select is_correct from exam_answers), 'La primera respuesta (incorrecta) sigue intacta');
select t.check(t.fails('insert into exam_attempts(user_id,week,attempt_no) values (''a0000000-0000-0000-0000-000000000003'',3,2)'), 'Restricción: el examen tiene UN solo intento (attempt_no = 1)');

-- 6. Preparación: porcentaje 50/30/20
update exam_attempts set completed_at = now(), score_percent = 100 where id = 'b0000000-0000-0000-0000-000000000001';
insert into presentation_usage(user_id,week,slide,seconds) select 'a0000000-0000-0000-0000-000000000003', 1, s, case when s <= 4 then 5 when s = 5 then 4 else 0 end from generate_series(1,5) s;
do $$ declare r record; begin
  select * into r from teacher_prep('a0000000-0000-0000-0000-000000000003', 1);
  perform t.check(r.guide_pts = 26.1, 'Guía: 12 de 23 apartados = 26,1 de 50 (no se regala)');
  perform t.check(r.exam_pts = 30.0, 'Examen: único intento con 100 % = 30 de 30');
  perform t.check(r.presentation_pts = 8.9, 'Presentación: 4 de 9 diapositivas (≥5 s) = 8,9 de 20; la de 4 s no cuenta');
  perform t.check(r.total_pts = 65.0, 'Total de preparación = 65,0');
end $$;

-- 7. Tareas: ventana de entrega y privacidad
insert into assignments(id, week, title, opens_at, closes_at, created_by) values
 ('c0000000-0000-0000-0000-000000000001', 1, 'Abierta',  now() - interval '1 hour',  now() + interval '1 hour',  'a0000000-0000-0000-0000-000000000003'),
 ('c0000000-0000-0000-0000-000000000002', 1, 'Cerrada',  now() - interval '3 days',  now() - interval '1 day',   'a0000000-0000-0000-0000-000000000003');
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid);
  perform t.check(t.rows(format('insert into submissions(assignment_id,student_id,kind,url) values (%L,%L,''ENLACE'',''https://x.test/a'')', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'::uuid)) = 1, 'Estudiante entrega dentro de la ventana');
  perform t.check(t.fails(format('insert into submissions(assignment_id,student_id,kind,url) values (%L,%L,''ENLACE'',''https://x.test/b'')', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005'::uuid)), 'Fuera de la ventana: se bloquea la entrega nueva');
  perform t.check(t.fails(format('insert into submissions(assignment_id,student_id,kind,url) values (%L,%L,''ENLACE'',''https://x.test/c'')', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006'::uuid)), 'Nadie entrega a nombre de otro estudiante');
  perform t.check(t.rows('update submissions set url = ''https://x.test/cambio''') = 0 and t.rows('delete from submissions') = 0, 'La entrega hecha se conserva: el estudiante no la edita ni la borra');
  perform t.as_user('a0000000-0000-0000-0000-000000000006'::uuid);   perform t.check((select count(*) from submissions) = 0, 'Otro estudiante NO ve la entrega ajena');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);   perform t.check((select count(*) from submissions) = 0, 'Maestro NO asignado no ve entregas');
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);   perform t.check((select count(*) from submissions) = 1, 'Maestro asignado SÍ ve la entrega');
  perform t.check(t.rows('update submissions set grade = 25') = 0, 'El maestro NO edita la entrega directamente (solo califica con la función)');
  perform grade_submission((select id from submissions limit 1), 24, 'Muy bien');
  perform t.check((select grade from submissions limit 1) = 24 and (select teacher_comment from submissions limit 1) = 'Muy bien', 'Maestro asignado comenta y califica con grade_submission()');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);
  perform t.check(t.fails('select grade_submission((select id from submissions limit 1), 1, null)') , 'Un maestro NO asignado no califica');
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
end $$;

-- 8. Recursos reemplazables
do $$ declare rid uuid; begin
  perform t.as_user('a0000000-0000-0000-0000-000000000001'::uuid);
  insert into resources(week,kind,title,audience) values (1,'PRESENTACION','Presentación Semana 1','MAESTRO') returning id into rid;
  insert into resources(week,kind,title,audience) values (1,'HOJA_TRABAJO','Hoja de trabajo Semana 1','ESTUDIANTE');
  insert into resource_versions(resource_id,storage_path,filename,uploaded_by) values (rid,'v1/p.pptx','p.pptx','a0000000-0000-0000-0000-000000000001'::uuid);
  insert into resource_versions(resource_id,storage_path,filename,uploaded_by) values (rid,'v2/p.pptx','p.pptx','a0000000-0000-0000-0000-000000000001'::uuid);
  perform t.check((select count(*) from resource_versions where resource_id = rid and is_current) = 1 and (select count(*) from resource_versions where resource_id = rid) = 2, 'Reemplazar = nueva versión vigente; la anterior se conserva');
  perform t.check(t.fails(format('insert into resources(week,kind,title) values (1,''PRESENTACION'',''Duplicado'')')), 'No se pueden crear duplicados del mismo recurso');
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid); perform t.check(t.rows(format('update resources set title = ''Presentación (nueva)'' where id = %L', rid)) = 1, 'Pastor también reemplaza recursos');
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid);   perform t.check((select count(*) from resources) = 1 and (select audience from resources) = 'ESTUDIANTE', 'Estudiante ve su hoja, NO la presentación del maestro');
  perform t.check(t.fails(format('insert into resources(week,kind,title) values (2,''PDF'',''x'')')), 'Estudiante NO agrega recursos');
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);   perform t.check((select count(*) from resources) = 1 and (select audience from resources) = 'MAESTRO', 'Maestro ve el recurso para maestros');
end $$;

-- 9. Asignación a tiempo / fuera de tiempo / atrasada
update teacher_assignments set assigned_at = '2026-03-01 18:00+00' where week = 1;
insert into class_sessions(week, teacher_id, started_by, started_at, ended_at, status) values
 (1, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2026-03-01 15:00+00', '2026-03-01 16:00+00', 'FINALIZADA'),
 (2, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2026-03-08 15:00+00', '2026-03-08 16:00+00', 'FINALIZADA'),
 (3, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2026-03-15 15:00+00', '2026-03-15 16:00+00', 'FINALIZADA');
insert into teacher_assignments(week, teacher_id, assigned_by, assigned_at) values
 (2, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2026-03-01 18:00+00'),   -- mismo día de la clase anterior
 (3, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2026-03-10 15:00+00');   -- 2 días después
select t.check((select status from v_assignment_status where week = 2) = 'A_TIEMPO' and (select days_late from v_assignment_status where week = 2) = 0, 'Asignado el mismo día de la clase anterior: A_TIEMPO');
select t.check((select status from v_assignment_status where week = 3) = 'FUERA_DE_TIEMPO' and (select days_late from v_assignment_status where week = 3) = 2, 'Asignado 2 días después: FUERA_DE_TIEMPO con 2 días de atraso');
select t.check((select status from v_assignment_status where week = 4) = 'ATRASADA' and (select days_late from v_assignment_status where week = 4) >= 1, 'Sin maestro pasadas 4 horas: ATRASADA con días de atraso');
select t.check((select status from v_assignment_status where week = 5) = 'SIN_REFERENCIA', 'Sin clase anterior registrada: SIN_REFERENCIA');
select t.check((select generate_assignment_alerts()) = 2, 'Alerta de lección sin maestro: notifica a Pastor y Administrador');
select t.check((select generate_assignment_alerts()) = 0, 'Las alertas no se repiten');
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid); perform t.check((select count(*) from notifications) = 1, 'El Pastor ve su notificación');
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);   perform t.check((select count(*) from notifications where kind = 'FALTA_MAESTRO') = 0 and (select count(*) from notifications) >= 1, 'El maestro solo ve SUS notificaciones (no las alertas de Pastor/Admin)');
  perform t.check(t.fails('select generate_assignment_alerts()'), 'Ningún usuario puede disparar las alertas a mano');
end $$;

-- 10. Iniciar y finalizar clase
insert into teacher_assignments(week, teacher_id, assigned_by) values (6, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002'), (7, 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002');
do $$ declare sid uuid; begin
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
  perform t.check(t.fails('select start_class(6)'), 'Maestro asignado SIN preparación completa no puede iniciar la clase');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);
  perform t.check(t.fails('select start_class(6)'), 'Un maestro NO asignado no puede iniciar la clase');
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid);
  perform t.check(t.fails('select start_class(6)'), 'Un estudiante no puede iniciar clases');
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid);
  sid := start_class(6);
  perform t.check(sid is not null, 'Pastor SÍ puede iniciar la clase si el maestro no cumple');
  perform t.check(t.fails('select start_class(6)'), 'No se puede abrir una segunda clase de la misma lección');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid); perform t.check(t.fails(format('select end_class(%L)', sid)), 'Un maestro ajeno no finaliza la clase');
  perform t.as_user('a0000000-0000-0000-0000-000000000002'::uuid); perform end_class(sid);
  perform t.check((select status from class_sessions where id = sid) = 'FINALIZADA' and (select duration_seconds from class_sessions where id = sid) is not null, 'Al finalizar se guarda hora final y duración');
  perform t.check((select count(*) from class_reports where session_id = sid) = 1 and (select sent_to_pastor from class_reports where session_id = sid) is null, 'Se guarda el informe; el envío queda SIN simular (sent_to_* vacío)');
end $$;
insert into guide_progress(user_id, week, section, seconds, completed_at) select 'a0000000-0000-0000-0000-000000000003', 6, s, 30, now() from generate_series(1,23) s;
insert into exam_attempts(user_id,week,attempt_no,completed_at,score_percent) values ('a0000000-0000-0000-0000-000000000003', 6, 1, now(), 80);
update class_sessions set status = 'FINALIZADA', ended_at = now() where week = 6 and status = 'EN_CURSO';
do $$ declare sid uuid; begin
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
  sid := start_class(6);
  perform t.check(sid is not null and (select started_by from class_sessions where id = sid) = 'a0000000-0000-0000-0000-000000000003'::uuid, 'Maestro asignado con guía completa y examen SÍ inicia su clase');
  perform t.check(t.rows(format('insert into attendance(session_id,student_id,status,recorded_by) values (%L,%L,''PRESENTE'',%L)', sid, 'a0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid)) = 1, 'Pase de lista: el maestro de la clase registra asistencia');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);
  perform t.check(t.fails(format('insert into attendance(session_id,student_id,status,recorded_by) values (%L,%L,''PRESENTE'',%L)', sid, 'a0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid)), 'Otro maestro NO registra asistencia en una clase ajena');
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid); perform t.check((select count(*) from attendance) = 1, 'El estudiante ve su asistencia');
  perform t.as_user('a0000000-0000-0000-0000-000000000006'::uuid); perform t.check((select count(*) from attendance) = 0, 'El estudiante no ve la de otros');
end $$;

-- 11. Actividad de integración y coronas
insert into integration_activities(week, title, points) values (6, 'Actividad de prueba', 5);
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-000000000003'::uuid);
  perform t.check(t.fails(format('insert into integration_participations(week,student_id,registered_by) values (6,%L,%L)', 'a0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid)), 'El maestro de la MISMA lección no registra la participación');
  perform t.as_user('a0000000-0000-0000-0000-000000000004'::uuid);
  perform t.check(t.rows(format('insert into integration_participations(week,student_id,registered_by) values (6,%L,%L)', 'a0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid)) = 1, 'El maestro de la lección SIGUIENTE registra quién participó');
  perform t.as_user('a0000000-0000-0000-0000-000000000005'::uuid); perform t.check((select count(*) from crowns) = 1, 'La participación suma una CORONA (el estudiante la ve)');
  perform t.as_user('a0000000-0000-0000-0000-000000000006'::uuid); perform t.check((select count(*) from crowns where student_id = 'a0000000-0000-0000-0000-000000000005'::uuid) = 0, 'Otro estudiante no ve las coronas ajenas');
end $$;

