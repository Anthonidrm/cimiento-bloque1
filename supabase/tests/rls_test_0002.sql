\set ON_ERROR_STOP on
create function t.u(n int) returns uuid language sql immutable as $$ select ('a0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid $$;
-- usuarios extra: estudiante sin grupo (7) y maestro inactivo (8)
insert into auth.users(id, email) values (t.u(7), 'est3@t'), (t.u(8), 'ana@t');
insert into profiles(id, username, display_name, role, active) values (t.u(7), 'est3', 'Estudiante 3', 'ESTUDIANTE', true), (t.u(8), 'ana', 'Ana', 'MAESTRO', false);

-- ===== Módulos =====
do $$ begin
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from modules) = 12 and (select count(*) from lessons) = 52, 'Hay 12 módulos y 52 lecciones; el estudiante puede leerlos');
  perform t.check(t.rows('update modules set title = ''x'' where id = 1') = 0, 'El estudiante no modifica módulos');
end $$;

-- ===== Examen calificado en el servidor (UN solo intento) =====
insert into exam_questions(question_id, week, kind, correct_option, pairs, needs_review) values
 ('s10-q1', 10, 'doctrinal',  'b', null, false),
 ('s10-q2', 10, 'true_false', 'v', null, false),
 ('s10-q3', 10, 'matching',   null, '[{"left":"A","right":"1"},{"left":"B","right":"2"}]', true);
do $$ declare r jsonb; begin
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from exam_questions) = 0, 'El maestro NO puede ver las claves de respuesta del examen');
  r := exam_answer(10, 's10-q1', 'a');
  perform t.check((r->>'is_correct')::boolean = false and r->>'correct_option' = 'b', 'Respuesta incorrecta: el servidor la califica y devuelve la correcta');
  perform t.check(t.fails('select exam_answer(10, ''s10-q1'', ''b'')'), 'No se puede cambiar la primera respuesta');
  perform t.check(t.fails('select exam_answer(9, ''s10-q2'', ''v'')'), 'Una pregunta de otra lección se rechaza');
  r := exam_answer(10, 's10-q2', 'v');
  perform t.check((r->>'is_correct')::boolean and (r->>'completed')::boolean = false, 'Respuesta correcta registrada; el examen sigue abierto');
  r := exam_answer(10, 's10-q3', null, '{"A":"1"}');
  perform t.check((r->>'is_correct')::boolean = false and (r->>'completed')::boolean and (r->>'score_percent')::int = 33, 'Relación incompleta = incorrecta; al terminar queda la nota 33 %');
  perform t.check(t.fails('select exam_answer(10, ''s10-q1'', ''b'')'), 'Terminado el examen no se acepta nada más (intento único)');
  perform t.as_user(t.u(5));
  perform t.check(t.fails('select exam_answer(10, ''s10-q1'', ''b'')'), 'Un estudiante no puede hacer el examen del maestro');
  perform t.as_user(t.u(4));
  perform t.check((select count(*) from exam_answers) = 0, 'Otro maestro no ve las respuestas ajenas');
  perform t.as_user(t.u(2));
  perform t.check((select count(*) from exam_answers a join exam_attempts x on x.id = a.attempt_id where x.week = 10) = 3 and (select score_percent from exam_attempts where user_id = t.u(3) and week = 10) = 33, 'El Pastor ve las respuestas y la nota del maestro');
end $$;
select t.check((select exam_pts from teacher_prep(t.u(3), 10)) = 8.3, 'Preparación: examen 33 % = 8,3 de 25 puntos');

-- ===== Guía secuencial en el servidor =====
do $$ declare r jsonb; begin
  perform t.as_user(t.u(3));
  perform t.check(t.fails('select guide_add_seconds(10, 2, 5)'), 'No se puede saltar al apartado 2 sin completar el 1');
  r := guide_add_seconds(10, 1, 29);
  perform t.check(not (r->>'completed')::boolean, 'A los 29 s el apartado 1 no está completo');
  r := guide_add_seconds(10, 1, 1);
  perform t.check((r->>'completed')::boolean and (r->>'sections_done')::int = 1, 'A los 30 s se completa el apartado 1');
  perform t.check(guide_add_seconds(10, 2, 5) is not null, 'Ahora sí se permite el apartado 2');
  perform t.check(t.fails('select guide_add_seconds(10, 3, 5)'), 'El 3 sigue bloqueado');
  perform t.check(t.fails('select guide_add_seconds(10, 1, 9999)'), 'Un tiempo imposible se rechaza');
  perform t.check(t.fails('insert into guide_progress(user_id,week,section,seconds,completed_at) values (t.u(3), 10, 5, 99, now())'), 'El maestro NO escribe su progreso directamente');
  perform t.check(t.rows('update guide_progress set completed_at = now()') = 0, 'Ni marcar apartados como completados');
  perform t.as_user(t.u(5));
  perform t.check(t.fails('select guide_add_seconds(10, 1, 5)'), 'Un estudiante no usa la guía del maestro');
end $$;
select t.check((select guide_pts from teacher_prep(t.u(3), 10)) = 2.0, 'Preparación: 1 de 23 apartados = 2,0 de 45');

-- ===== Presentación por uso real (en el servidor) =====
do $$ begin
  perform t.as_user(t.u(3));
  perform presentation_add_seconds(10, 1, 4);
  perform t.check((select presentation_pts from teacher_prep(t.u(3), 10)) = 0, '4 s no cuentan la diapositiva');
  perform t.check(presentation_add_seconds(10, 1, 1) = 5, 'A los 5 s la diapositiva cuenta');
  perform t.check(t.fails('select presentation_add_seconds(10, 10, 5)'), 'Una diapositiva inexistente se rechaza');
  perform t.check(t.fails('select presentation_add_seconds(10, 1, 5, gen_random_uuid())'), 'No se vincula a una sesión que no está en curso');
  perform t.check(t.fails('insert into presentation_usage(user_id,week,slide,seconds) values (t.u(3), 10, 2, 999)'), 'El maestro NO escribe su uso de la presentación directamente');
end $$;
select t.check((select presentation_pts from teacher_prep(t.u(3), 10)) = 1.7, 'Preparación: 1 de 9 diapositivas = 1,7 de 15');

-- ===== Asignación de maestros: quién y cuándo lo fija el servidor =====
do $$ begin
  perform t.as_user(t.u(2));
  perform t.check(t.rows('insert into teacher_assignments(week,teacher_id,assigned_by) values (9, t.u(4), t.u(1))') = 1, 'Pastor asigna al maestro (aunque diga que lo hizo el admin)');
  perform t.check((select assigned_by from teacher_assignments where week = 9) = t.u(2), 'assigned_by lo fija el servidor: es el Pastor');
  perform t.check(t.fails('insert into teacher_assignments(week,teacher_id,assigned_by) values (12, t.u(5), t.u(2))'), 'No se puede asignar a un estudiante');
  perform t.check(t.fails('insert into teacher_assignments(week,teacher_id,assigned_by) values (12, t.u(8), t.u(2))'), 'No se puede asignar a un maestro inactivo');
  perform t.as_user(t.u(4));
  perform t.check((select count(*) from notifications where kind = 'ASIGNACION' and (payload->>'week')::int = 9) = 1, 'El maestro asignado recibe su notificación');
end $$;

-- ===== Clase: iniciar, pasar lista, puntuación, informe =====
insert into teacher_assignments(week, teacher_id, assigned_by) values (11, t.u(3), t.u(2));
insert into app_config(key, value) values ('report_recipients', '{"pastor":"pastor@prueba.invalid","administrador":"admin@prueba.invalid"}');
do $$ declare sid uuid; rep jsonb; begin
  perform t.as_user(t.u(2));
  sid := start_class(11, 'd0000000-0000-0000-0000-000000000001');
  perform t.as_user(t.u(3));
  perform t.check(t.rows(format('insert into attendance(session_id,student_id,status,recorded_by) values (%L,t.u(5),''PRESENTE'',t.u(3))', sid)) = 1, 'Pase de lista: PRESENTE');
  perform t.check(t.rows(format('insert into attendance(session_id,student_id,status,recorded_by) values (%L,t.u(6),''AUSENTE'',t.u(3))', sid)) = 1, 'Pase de lista: AUSENTE');
  perform session_event(sid, 'ACTIVIDAD', '{"nombre":"Dinámica Yo fui hecho a propósito"}');
  perform session_event(sid, 'INTERACCION', '{"nota":"Preguntas de los niños"}');
  perform session_note(sid, 'Los niños participaron con mucho entusiasmo.');
  perform t.as_user(t.u(5));
  perform t.check(t.fails(format('select session_event(%L, ''NOTA'', ''{}'')', sid)), 'Un estudiante no registra eventos de clase');
  perform t.check((select attendance_pts from lesson_scores where student_id = t.u(5) and week = 11) = 25, 'La asistencia alimenta la puntuación: PRESENTE = 25');
  perform t.as_user(t.u(6));
  perform t.check((select attendance_pts from lesson_scores where student_id = t.u(6) and week = 11) = 0 and (select count(*) from lesson_scores) = 1, 'AUSENTE = 0 y cada estudiante solo ve lo suyo');
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from lesson_scores where week = 11) = 2, 'El maestro ve la puntuación de SUS estudiantes');
  perform t.as_user(t.u(4));
  perform t.check((select count(*) from lesson_scores) = 0, 'Otro maestro no ve puntuaciones ajenas');
  perform t.as_user(t.u(3));
  perform end_class(sid);
  perform t.as_user(t.u(2));
  select content into rep from class_reports where session_id = sid;
  perform t.as_user(t.u(3));
  perform t.check((rep->'lesson'->>'week')::int = 11 and rep->'teacher'->>'name' = 'Lela' and rep->>'observations' like '%entusiasmo%', 'Informe: lección, maestro y observaciones');
  perform t.check(jsonb_array_length(rep->'students') = 2 and (rep->'attendance'->>'PRESENTE')::int = 1 and (rep->'attendance'->>'AUSENTE')::int = 1 and (rep->>'interactions')::int = 1 and jsonb_array_length(rep->'activities') = 1 and rep ? 'started_at' and rep ? 'duration_seconds', 'Informe: estudiantes, asistencia, actividades, interacciones, horas y duración');
  perform t.check(t.fails(format('select session_event(%L, ''NOTA'', ''{}'')', sid)), 'Finalizada la clase ya no se registran eventos');
  perform t.check(t.fails('insert into class_reports(session_id, content) values (gen_random_uuid(), ''{}'')'), 'El informe no se crea a mano');
end $$;
select t.check((select count(*) from notification_deliveries where kind = 'INFORME_CLASE' and status = 'PENDIENTE' and sent_at is null and channel = 'CORREO') = 2, 'El informe queda en COLA de correo (PENDIENTE, sin enviar): no se simula el envío');
do $$ begin
  perform t.as_user(t.u(2));
  perform t.check((select count(*) from notifications where kind = 'CLASE' and (payload->>'week')::int = 11) = 1 and (select count(*) from notification_deliveries) = 2, 'Pastor ve la notificación del informe y la cola');
  perform t.check((select count(*) from v_sessions where week = 11 and present = 1 and absent = 1 and has_report) = 1, 'Vista de clases: asistencia y informe');
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from notification_deliveries) = 0, 'El maestro no ve la cola de envíos');
end $$;

-- ===== Tareas, calificación, participación y puntos 4×25 =====
insert into assignments(id, week, title, opens_at, closes_at, created_by) values ('c0000000-0000-0000-0000-0000000000a1', 11, 'Tarea semana 11', now() - interval '1 hour', now() + interval '10 hours', t.u(3));
do $$ begin
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from notifications where kind = 'TAREA_NUEVA') >= 1, 'El estudiante recibe la notificación de tarea nueva');
  perform t.check(t.rows('insert into submissions(assignment_id,student_id,kind,url) values (''c0000000-0000-0000-0000-0000000000a1'', t.u(5), ''ENLACE'', ''https://x.test/t11'')') = 1, 'El estudiante entrega la tarea');
  perform t.as_user(t.u(3));
  perform grade_submission((select id from submissions where assignment_id = 'c0000000-0000-0000-0000-0000000000a1'), 20, 'Buen trabajo');
  perform set_participation(t.u(5), 11, 25);
  perform t.check(t.fails('select set_participation(t.u(5), 11, 30)'), 'La participación máxima es 25');
  perform t.as_user(t.u(4));
  perform t.check(t.fails('select set_participation(t.u(5), 11, 10)') and t.fails('select grade_submission((select id from submissions limit 1), 5, null)'), 'Otro maestro no califica ni da participación');
  perform t.as_user(t.u(5));
  perform t.check(t.fails('select set_participation(t.u(5), 11, 25)'), 'El estudiante no se califica a sí mismo');
  perform t.check(exists (select 1 from notifications where kind = 'RESULTADO' and payload->>'submission' = (select id::text from submissions where assignment_id = 'c0000000-0000-0000-0000-0000000000a1')), 'Recibe la notificación de su calificación');
  perform t.check((select total from lesson_scores where student_id = t.u(5) and week = 11) = 70, 'Puntuación: asistencia 25 + tarea 20 + participación 25 + examen 0 = 70');
end $$;

-- ===== Juegos / pruebas lúdicas =====
insert into games(id, week, kind, title, config, active, counts_as_exam, max_score) values
 ('e0000000-0000-0000-0000-000000000001', 11, 'ORDENAR_PALABRAS', 'Prueba de la semana 11', '{}', true, true, 100),
 ('e0000000-0000-0000-0000-000000000002', 11, 'MEMORIA', 'Juego inactivo', '{}', false, false, 100);
do $$ begin
  perform t.as_user(t.u(5));
  perform t.check(t.rows('insert into game_results(game_id,student_id,score,max_score) values (''e0000000-0000-0000-0000-000000000001'', t.u(5), 80, 100)') = 1, 'El estudiante guarda su resultado de la prueba');
  perform t.check((select exam_pts from lesson_scores where student_id = t.u(5) and week = 11) = 20 and (select total from lesson_scores where student_id = t.u(5) and week = 11) = 90, 'La prueba aporta 20 de 25 al examen: total 90');
  perform t.check(t.fails('insert into game_results(game_id,student_id,score,max_score) values (''e0000000-0000-0000-0000-000000000001'', t.u(6), 100, 100)'), 'No se guarda un resultado a nombre de otro');
  perform t.check(t.fails('insert into game_results(game_id,student_id,score,max_score) values (''e0000000-0000-0000-0000-000000000002'', t.u(5), 50, 100)'), 'No se juega un juego inactivo');
  perform t.check(t.fails('insert into game_results(game_id,student_id,score,max_score) values (''e0000000-0000-0000-0000-000000000001'', t.u(5), 150, 100)'), 'La puntuación no puede superar el máximo');
  perform t.as_user(t.u(6));
  perform t.check((select count(*) from game_results) = 0, 'Otro estudiante no ve resultados ajenos');
end $$;

-- ===== Recordatorios =====
insert into assignments(id, week, title, opens_at, closes_at, created_by) values ('c0000000-0000-0000-0000-0000000000a2', 11, 'Tarea por vencer', now() - interval '2 hours', now() + interval '5 hours', t.u(3));
select t.check((select generate_reminders()) >= 1, 'Recordatorio: tarea por vencer para quien aún no entrega');
select t.check((select generate_reminders()) = 0, 'Los recordatorios no se repiten');
do $$ begin
  perform t.as_user(t.u(6)); perform t.check(exists (select 1 from notifications where kind = 'TAREA_PENDIENTE' and payload->>'assignment' = 'c0000000-0000-0000-0000-0000000000a2'), 'El estudiante pendiente recibe el recordatorio');
  perform t.check(t.fails('select generate_reminders()'), 'Nadie dispara los recordatorios a mano');
end $$;

-- ===== Actividades obligatorias y de integración =====
insert into mandatory_activities(id, week, title, instructions, points, due_at, created_by) values
 ('f0000000-0000-0000-0000-000000000001', 11, 'Actividad vigente', 'Instrucciones', 5, now() + interval '2 days', t.u(2)),
 ('f0000000-0000-0000-0000-000000000002', 11, 'Actividad vencida', 'Instrucciones', 5, now() - interval '1 day', t.u(2));
do $$ begin
  perform t.as_user(t.u(5));
  perform t.check(t.rows('insert into activity_submissions(activity_id,student_id,evidence) values (''f0000000-0000-0000-0000-000000000001'', t.u(5), ''foto'')') = 1, 'El estudiante completa la actividad vigente');
  perform t.check(t.fails('insert into activity_submissions(activity_id,student_id) values (''f0000000-0000-0000-0000-000000000002'', t.u(5))'), 'No se completa una actividad vencida');
  perform t.as_user(t.u(6)); perform t.check((select count(*) from activity_submissions) = 0, 'Otro estudiante no ve lo ajeno');
  perform t.as_user(t.u(3));
  perform t.check(t.rows('insert into integration_assignments(week,student_id,assigned_by) values (6, t.u(5), t.u(3))') = 1, 'El maestro de la lección asigna estudiantes a la actividad de integración');
  perform t.as_user(t.u(4));
  perform t.check(t.fails('insert into integration_assignments(week,student_id,assigned_by) values (6, t.u(6), t.u(4))'), 'Otro maestro no asigna');
  perform t.as_user(t.u(5)); perform t.check((select count(*) from integration_assignments) = 1, 'El estudiante ve su asignación de integración');
end $$;

-- ===== Fotos: el estudiante solo ve las de su grupo =====
do $$ declare sid uuid; begin
  select id into sid from class_sessions where week = 11;
  perform t.as_user(t.u(3));
  perform t.check(t.rows(format('insert into class_photos(week,session_id,storage_path,uploaded_by) values (11,%L,''11/%s/foto1.jpg'',t.u(3))', sid, sid)) = 1, 'El maestro sube una foto de la clase');
  perform t.as_user(t.u(5)); perform t.check((select count(*) from class_photos) = 1, 'El estudiante del grupo ve la foto');
  perform t.check(t.fails('insert into class_photos(week,storage_path,uploaded_by) values (11,''x'',t.u(5))'), 'El estudiante no sube fotos');
  perform t.as_user(t.u(7)); perform t.check((select count(*) from class_photos) = 0, 'Un estudiante de otro grupo no la ve');
end $$;

-- ===== Vistas de progreso =====
do $$ begin
  perform t.as_user(t.u(2));
  perform t.check((select count(*) from v_teacher_progress) >= 3, 'Pastor ve el progreso de todos los maestros');
  perform t.check((select count(*) from v_student_progress) >= 2, 'Pastor ve el progreso de los estudiantes');
  perform t.as_user(t.u(3));
  perform t.check((select count(distinct teacher_id) from v_teacher_progress) = 1, 'El maestro solo ve SU progreso, no el de otros maestros');
  perform t.check((select count(distinct student_id) from v_student_progress) = 2, 'El maestro ve el progreso de sus estudiantes');
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from v_teacher_progress) = 0 and (select count(distinct student_id) from v_student_progress) = 1, 'El estudiante no ve maestros y solo ve su propio progreso');
end $$;

-- ===== Ayudas para la aplicación =====
do $$ begin
  perform t.as_user(t.u(5));
  perform t.check((select role from my_profile()) = 'ESTUDIANTE' and (select id from my_profile()) = t.u(5), 'my_profile(): cada usuario obtiene su propio perfil y rol');
  perform t.check((select teacher_name from v_lessons where week = 11) = 'Lela' and (select module_title from v_lessons where week = 11) = 'Dios me ama', 'El estudiante ve el MAESTRO ASIGNADO de cada lección (nombre) y su módulo');
  perform t.check((select count(*) from v_lessons) = 52, 'v_lessons muestra las 52 lecciones');
  perform t.as_user(t.u(8));
  perform t.check((select count(*) from my_profile()) = 0 and (select count(*) from v_lessons) = 0, 'Un usuario DESACTIVADO no obtiene perfil ni datos');
  perform t.as_user(t.u(3));
  perform t.check(t.fails('insert into class_photos(week,storage_path,uploaded_by) values (11,''ruta/otra.jpg'',t.u(4))'), 'No se puede subir una foto a nombre de otro usuario');
  insert into class_photos(week,storage_path) values (11,'ruta/sellada.jpg');
  perform t.check((select uploaded_by from class_photos where storage_path = 'ruta/sellada.jpg') = t.u(3), 'uploaded_by lo pone el servidor (auth.uid())');
end $$;
